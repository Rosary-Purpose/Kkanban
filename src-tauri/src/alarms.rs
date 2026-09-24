// Due-date alarms, handed to Windows' own notification scheduler so they
// ring even while kkanban is closed. Windows only accepts these from an app
// it recognizes: the installer's Start menu shortcut carries APP_ID, and the
// running process claims the same ID at startup (claim_app_id) so Windows
// matches the two up - which is why this works in `tauri dev` too once
// kkanban has been installed at least once.
//
// Windows also silently drops a *scheduled* notification from an app that
// has never shown one on screen. That's why turning notifications on in
// Settings shows an ordinary "notifications are on" toast right away
// (show_notification) - it's what introduces kkanban to Windows.

use serde::Deserialize;

pub const APP_ID: &str = "com.raincow.kkanban";

// Windows caps how many notifications one app can have scheduled.
const MAX_SCHEDULED: usize = 200;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Alarm {
    id: String,
    when_ms: i64,
    title: String,
    body: String,
    url: String,
    kind: String, // "alarm" (looping, stays up) or "headsup" (ordinary toast)
}

#[cfg(windows)]
pub fn claim_app_id() {
    use windows::core::HSTRING;
    use windows::Win32::UI::Shell::SetCurrentProcessExplicitAppUserModelID;
    unsafe {
        let _ = SetCurrentProcessExplicitAppUserModelID(&HSTRING::from(APP_ID));
    }
}

#[cfg(not(windows))]
pub fn claim_app_id() {}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn alarm_xml(a: &Alarm) -> String {
    let (title, body, url) = (xml_escape(&a.title), xml_escape(&a.body), xml_escape(&a.url));
    if a.kind == "alarm" {
        format!(
            r#"<toast scenario="alarm" launch="{url}" activationType="protocol">
  <visual><binding template="ToastGeneric"><text>{title}</text><text>{body}</text></binding></visual>
  <audio src="ms-winsoundevent:Notification.Looping.Alarm" loop="true"/>
  <actions>
    <action content="Open" activationType="protocol" arguments="{url}"/>
    <action content="Dismiss" activationType="system" arguments="dismiss"/>
  </actions>
</toast>"#
        )
    } else {
        format!(
            r#"<toast launch="{url}" activationType="protocol">
  <visual><binding template="ToastGeneric"><text>{title}</text><text>{body}</text></binding></visual>
  <actions>
    <action content="Open" activationType="protocol" arguments="{url}"/>
  </actions>
</toast>"#
        )
    }
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(windows)]
mod win {
    use windows::core::HSTRING;
    use windows::Data::Xml::Dom::XmlDocument;
    use windows::UI::Notifications::{ScheduledToastNotification, ToastNotification, ToastNotificationManager, ToastNotifier};

    pub fn err(e: windows::core::Error) -> String {
        e.message().to_string()
    }

    pub fn notifier() -> Result<ToastNotifier, String> {
        ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(super::APP_ID)).map_err(err)
    }

    pub fn xml_doc(xml: &str) -> Result<XmlDocument, String> {
        let doc = XmlDocument::new().map_err(err)?;
        doc.LoadXml(&HSTRING::from(xml)).map_err(err)?;
        Ok(doc)
    }

    pub fn clear_scheduled(n: &ToastNotifier) -> Result<(), String> {
        let list = n.GetScheduledToastNotifications().map_err(err)?;
        for i in 0..list.Size().map_err(err)? {
            n.RemoveFromSchedule(&list.GetAt(i).map_err(err)?).map_err(err)?;
        }
        Ok(())
    }

    // Windows' clock counts 100-nanosecond ticks since 1601-01-01; JS gives
    // milliseconds since 1970-01-01.
    pub fn schedule(n: &ToastNotifier, xml: &str, when_ms: i64, id: &str) -> Result<(), String> {
        let when = windows::Foundation::DateTime { UniversalTime: (when_ms + 11_644_473_600_000) * 10_000 };
        let toast = ScheduledToastNotification::CreateScheduledToastNotification(&xml_doc(xml)?, when).map_err(err)?;
        toast.SetId(&HSTRING::from(id)).map_err(err)?;
        n.AddToSchedule(&toast).map_err(err)
    }

    pub fn show(xml: &str) -> Result<(), String> {
        let toast = ToastNotification::CreateToastNotification(&xml_doc(xml)?).map_err(err)?;
        notifier()?.Show(&toast).map_err(err)
    }
}

// Replaces everything kkanban has scheduled with exactly this list. The
// frontend sends the full list every time anything due-date-related changes
// (and an empty list when notifications are switched off), so Windows'
// queue can never drift out of sync with the boards.
#[tauri::command]
pub fn sync_due_alarms(alarms: Vec<Alarm>) -> Result<(), String> {
    #[cfg(windows)]
    {
        let n = win::notifier()?;
        win::clear_scheduled(&n)?;
        // A little slack so something due this very second isn't rejected
        // by Windows as already in the past.
        let cutoff = now_ms() + 2_000;
        let mut upcoming: Vec<&Alarm> = alarms.iter().filter(|a| a.when_ms > cutoff).collect();
        upcoming.sort_by_key(|a| a.when_ms);
        for a in upcoming.into_iter().take(MAX_SCHEDULED) {
            // One bad entry shouldn't stop the rest from being scheduled.
            let _ = win::schedule(&n, &alarm_xml(a), a.when_ms, &a.id);
        }
        return Ok(());
    }
    #[cfg(not(windows))]
    {
        let _ = alarms;
        Ok(())
    }
}

// An ordinary notification shown right now (the "notifications are on"
// confirmation, Pomodoro session ends).
#[tauri::command]
pub fn show_notification(title: String, body: String, silent: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        let audio = if silent { r#"<audio silent="true"/>"# } else { "" };
        let xml = format!(
            r#"<toast><visual><binding template="ToastGeneric"><text>{}</text><text>{}</text></binding></visual>{}</toast>"#,
            xml_escape(&title),
            xml_escape(&body),
            audio
        );
        return win::show(&xml);
    }
    #[cfg(not(windows))]
    {
        let _ = (title, body, silent);
        Err("Notifications are only supported on Windows.".into())
    }
}
