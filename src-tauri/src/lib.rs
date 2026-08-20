use std::{
    sync::Mutex,
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use tauri::{
    ipc::{InvokeBody, Request, Response},
    AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};

const PRESENTATION_STATE_CHANGED: &str = "presentation-state-changed";
const PRESENTER_WINDOW_LABEL: &str = "main";
const AUDIENCE_WINDOW_LABEL: &str = "audience";
const MAX_PDF_BYTES: usize = 200 * 1024 * 1024;

type SharedPresentationState = Mutex<PresentationState>;
type CommandResult<T> = Result<T, CommandError>;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandError {
    code: &'static str,
    message: String,
}

impl CommandError {
    fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    fn state_unavailable() -> Self {
        Self::new(
            "stateUnavailable",
            "発表状態を読み取れませんでした。アプリを再起動してください。",
        )
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
enum TimerStatus {
    #[default]
    Idle,
    Running,
    Paused,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PresentationMetadata {
    total_pages: u32,
    duration_seconds: u64,
    file_name: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PresentationSnapshot {
    current_page: u32,
    total_pages: u32,
    duration_seconds: u64,
    elapsed_seconds: u64,
    remaining_seconds: i64,
    timer_status: TimerStatus,
    revision: u64,
    has_pdf: bool,
    file_name: Option<String>,
}

#[derive(Default)]
struct PresentationState {
    current_page: u32,
    total_pages: u32,
    duration_seconds: u64,
    paused_elapsed: Duration,
    started_at: Option<Instant>,
    timer_status: TimerStatus,
    revision: u64,
    pdf_bytes: Vec<u8>,
    file_name: Option<String>,
}

impl PresentationState {
    fn elapsed(&self) -> Duration {
        match self.started_at {
            Some(started_at) => self.paused_elapsed + started_at.elapsed(),
            None => self.paused_elapsed,
        }
    }

    fn snapshot(&self) -> PresentationSnapshot {
        let elapsed_seconds = self.elapsed().as_secs();

        PresentationSnapshot {
            current_page: self.current_page.max(1),
            total_pages: self.total_pages,
            duration_seconds: self.duration_seconds,
            elapsed_seconds,
            remaining_seconds: self.duration_seconds as i64 - elapsed_seconds as i64,
            timer_status: self.timer_status,
            revision: self.revision,
            has_pdf: !self.pdf_bytes.is_empty(),
            file_name: self.file_name.clone(),
        }
    }

    fn configure(&mut self, metadata: PresentationMetadata) -> CommandResult<()> {
        if metadata.total_pages == 0 {
            return Err(CommandError::new(
                "invalidPageCount",
                "ページ数が0のPDFは開始できません。",
            ));
        }

        if metadata.duration_seconds == 0 {
            return Err(CommandError::new(
                "invalidDuration",
                "発表時間は1秒以上にしてください。",
            ));
        }

        self.current_page = 1;
        self.total_pages = metadata.total_pages;
        self.duration_seconds = metadata.duration_seconds;
        self.paused_elapsed = Duration::ZERO;
        self.started_at = None;
        self.timer_status = TimerStatus::Idle;
        self.pdf_bytes.clear();
        self.file_name = Some(metadata.file_name);
        self.bump_revision();

        Ok(())
    }

    fn set_pdf(&mut self, pdf_bytes: Vec<u8>) -> CommandResult<()> {
        if pdf_bytes.len() > MAX_PDF_BYTES {
            return Err(CommandError::new(
                "pdfTooLarge",
                "PDFは200MB以下にしてください。",
            ));
        }

        if !pdf_bytes.starts_with(b"%PDF-") {
            return Err(CommandError::new(
                "invalidPdf",
                "PDFとして認識できないファイルです。",
            ));
        }

        self.pdf_bytes = pdf_bytes;
        self.bump_revision();
        Ok(())
    }

    fn start(&mut self) -> CommandResult<()> {
        if self.total_pages == 0 || self.pdf_bytes.is_empty() {
            return Err(CommandError::new(
                "presentationNotReady",
                "PDFの読み込みが完了していません。",
            ));
        }

        if self.timer_status != TimerStatus::Running {
            self.started_at = Some(Instant::now());
            self.timer_status = TimerStatus::Running;
            self.bump_revision();
        }

        Ok(())
    }

    fn pause(&mut self) {
        if let Some(started_at) = self.started_at.take() {
            self.paused_elapsed += started_at.elapsed();
            self.timer_status = TimerStatus::Paused;
            self.bump_revision();
        }
    }

    fn reset(&mut self) {
        self.started_at = None;
        self.paused_elapsed = Duration::ZERO;
        self.timer_status = TimerStatus::Idle;
        self.bump_revision();
    }

    fn go_to_page(&mut self, page: u32) -> CommandResult<()> {
        if self.total_pages == 0 || page == 0 || page > self.total_pages {
            return Err(CommandError::new(
                "pageOutOfRange",
                format!(
                    "ページは1から{}の範囲で指定してください。",
                    self.total_pages
                ),
            ));
        }

        if self.current_page != page {
            self.current_page = page;
            self.bump_revision();
        }

        Ok(())
    }

    fn bump_revision(&mut self) {
        self.revision = self.revision.saturating_add(1);
    }
}

fn ensure_presenter(window: &WebviewWindow) -> CommandResult<()> {
    if window.label() != PRESENTER_WINDOW_LABEL {
        return Err(CommandError::new(
            "permissionDenied",
            "投影画面から発表状態を変更することはできません。",
        ));
    }

    Ok(())
}

fn emit_snapshot(app: &AppHandle, snapshot: &PresentationSnapshot) -> CommandResult<()> {
    app.emit(PRESENTATION_STATE_CHANGED, snapshot)
        .map_err(|error| CommandError::new("eventFailed", error.to_string()))
}

fn read_snapshot(
    state: &State<'_, SharedPresentationState>,
) -> CommandResult<PresentationSnapshot> {
    let presentation = state
        .lock()
        .map_err(|_| CommandError::state_unavailable())?;
    Ok(presentation.snapshot())
}

#[tauri::command]
fn get_presentation_snapshot(
    state: State<'_, SharedPresentationState>,
) -> CommandResult<PresentationSnapshot> {
    read_snapshot(&state)
}

#[tauri::command]
fn configure_presentation(
    window: WebviewWindow,
    app: AppHandle,
    state: State<'_, SharedPresentationState>,
    metadata: PresentationMetadata,
) -> CommandResult<PresentationSnapshot> {
    ensure_presenter(&window)?;

    let snapshot = {
        let mut presentation = state
            .lock()
            .map_err(|_| CommandError::state_unavailable())?;
        presentation.configure(metadata)?;
        presentation.snapshot()
    };

    emit_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn set_pdf_data(
    window: WebviewWindow,
    app: AppHandle,
    state: State<'_, SharedPresentationState>,
    request: Request<'_>,
) -> CommandResult<PresentationSnapshot> {
    ensure_presenter(&window)?;

    let InvokeBody::Raw(pdf_bytes) = request.body() else {
        return Err(CommandError::new(
            "rawBodyRequired",
            "PDFをバイナリ形式で送信してください。",
        ));
    };

    let snapshot = {
        let mut presentation = state
            .lock()
            .map_err(|_| CommandError::state_unavailable())?;
        presentation.set_pdf(pdf_bytes.clone())?;
        presentation.snapshot()
    };

    emit_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn get_pdf_data(state: State<'_, SharedPresentationState>) -> CommandResult<Response> {
    let presentation = state
        .lock()
        .map_err(|_| CommandError::state_unavailable())?;

    if presentation.pdf_bytes.is_empty() {
        return Err(CommandError::new(
            "pdfNotLoaded",
            "表示するPDFが読み込まれていません。",
        ));
    }

    Ok(Response::new(presentation.pdf_bytes.clone()))
}

#[tauri::command]
fn start_presentation(
    window: WebviewWindow,
    app: AppHandle,
    state: State<'_, SharedPresentationState>,
) -> CommandResult<PresentationSnapshot> {
    ensure_presenter(&window)?;

    let snapshot = {
        let mut presentation = state
            .lock()
            .map_err(|_| CommandError::state_unavailable())?;
        presentation.start()?;
        presentation.snapshot()
    };

    emit_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn pause_presentation(
    window: WebviewWindow,
    app: AppHandle,
    state: State<'_, SharedPresentationState>,
) -> CommandResult<PresentationSnapshot> {
    ensure_presenter(&window)?;

    let snapshot = {
        let mut presentation = state
            .lock()
            .map_err(|_| CommandError::state_unavailable())?;
        presentation.pause();
        presentation.snapshot()
    };

    emit_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn reset_presentation(
    window: WebviewWindow,
    app: AppHandle,
    state: State<'_, SharedPresentationState>,
) -> CommandResult<PresentationSnapshot> {
    ensure_presenter(&window)?;

    let snapshot = {
        let mut presentation = state
            .lock()
            .map_err(|_| CommandError::state_unavailable())?;
        presentation.reset();
        presentation.snapshot()
    };

    emit_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn go_to_page(
    window: WebviewWindow,
    app: AppHandle,
    state: State<'_, SharedPresentationState>,
    page: u32,
) -> CommandResult<PresentationSnapshot> {
    ensure_presenter(&window)?;

    let snapshot = {
        let mut presentation = state
            .lock()
            .map_err(|_| CommandError::state_unavailable())?;
        presentation.go_to_page(page)?;
        presentation.snapshot()
    };

    emit_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn open_audience_window(
    window: WebviewWindow,
    app: AppHandle,
    state: State<'_, SharedPresentationState>,
) -> CommandResult<()> {
    ensure_presenter(&window)?;

    let snapshot = read_snapshot(&state)?;
    if !snapshot.has_pdf {
        return Err(CommandError::new(
            "presentationNotReady",
            "PDFの読み込みが完了していません。",
        ));
    }

    if let Some(audience) = app.get_webview_window(AUDIENCE_WINDOW_LABEL) {
        audience
            .show()
            .and_then(|_| audience.set_focus())
            .map_err(|error| CommandError::new("windowOpenFailed", error.to_string()))?;
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        AUDIENCE_WINDOW_LABEL,
        WebviewUrl::App("index.html#/audience".into()),
    )
    .title("PDF Presenter Pacemaker — 投影画面")
    .inner_size(1280.0, 720.0)
    .min_inner_size(640.0, 360.0)
    .resizable(true)
    .build()
    .map_err(|error| CommandError::new("windowOpenFailed", error.to_string()))?;

    Ok(())
}

#[tauri::command]
fn close_audience_window(window: WebviewWindow, app: AppHandle) -> CommandResult<()> {
    ensure_presenter(&window)?;

    if let Some(audience) = app.get_webview_window(AUDIENCE_WINDOW_LABEL) {
        audience
            .close()
            .map_err(|error| CommandError::new("windowCloseFailed", error.to_string()))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(PresentationState::default()))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_presentation_snapshot,
            configure_presentation,
            set_pdf_data,
            get_pdf_data,
            start_presentation,
            pause_presentation,
            reset_presentation,
            go_to_page,
            open_audience_window,
            close_audience_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running PDF Presenter Pacemaker");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn configured_state() -> PresentationState {
        let mut state = PresentationState::default();
        state
            .configure(PresentationMetadata {
                total_pages: 12,
                duration_seconds: 600,
                file_name: "talk.pdf".into(),
            })
            .expect("configuration should succeed");
        state
            .set_pdf(b"%PDF-1.7\nprototype".to_vec())
            .expect("PDF should be accepted");
        state
    }

    #[test]
    fn snapshot_tracks_elapsed_and_remaining_time() {
        let mut state = configured_state();
        state.started_at = Some(Instant::now() - Duration::from_secs(75));
        state.timer_status = TimerStatus::Running;

        let snapshot = state.snapshot();

        assert_eq!(snapshot.elapsed_seconds, 75);
        assert_eq!(snapshot.remaining_seconds, 525);
        assert_eq!(snapshot.timer_status, TimerStatus::Running);
    }

    #[test]
    fn page_changes_increment_revision_and_validate_bounds() {
        let mut state = configured_state();
        let revision = state.revision;

        state.go_to_page(4).expect("page should be valid");

        assert_eq!(state.current_page, 4);
        assert_eq!(state.revision, revision + 1);
        assert!(state.go_to_page(13).is_err());
    }

    #[test]
    fn invalid_pdf_is_rejected() {
        let mut state = PresentationState::default();
        let error = state
            .set_pdf(b"not a pdf".to_vec())
            .expect_err("invalid data should fail");

        assert_eq!(error.code, "invalidPdf");
    }
}
