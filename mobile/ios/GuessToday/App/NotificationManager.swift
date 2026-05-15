import Foundation
import UserNotifications

final class NotificationManager {
    static let shared = NotificationManager()
    private init() {}

    private let enabledKey = "notif_daily_enabled"
    private let hourKey    = "notif_daily_hour"
    private let notifID    = "guesstoday_daily_reminder"

    var isEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: enabledKey) }
        set {
            UserDefaults.standard.set(newValue, forKey: enabledKey)
            newValue ? scheduleDaily() : cancelDaily()
        }
    }

    var reminderHour: Int {
        get {
            let stored = UserDefaults.standard.integer(forKey: hourKey)
            return stored == 0 ? 8 : stored
        }
        set {
            UserDefaults.standard.set(newValue, forKey: hourKey)
            if isEnabled { scheduleDaily() }
        }
    }

    func scheduleDaily() {
        cancelDaily()
        let content = UNMutableNotificationContent()
        content.title = "GuessToday 🎬"
        content.body = messages.randomElement() ?? "Le défi du jour vous attend !"
        content.sound = .default

        var comps = DateComponents()
        comps.hour = reminderHour
        comps.minute = 0
        comps.timeZone = TimeZone(identifier: "Europe/Paris")

        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
        let request = UNNotificationRequest(identifier: notifID, content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }

    func cancelDaily() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [notifID])
    }

    func checkAuthorizationStatus(completion: @escaping (UNAuthorizationStatus) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async { completion(settings.authorizationStatus) }
        }
    }

    private let messages = [
        "Trois défis vous attendent aujourd'hui 🎯",
        "Le défi du jour est arrivé ! Saurez-vous trouver ?",
        "Films, séries, personnalités — à vous de jouer !",
        "Votre série quotidienne continue… ne la brisez pas ! 🔥",
        "Nouveau défi disponible. Êtes-vous prêt ?",
    ]
}
