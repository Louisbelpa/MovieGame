import AudioToolbox

final class SoundManager {
    static let shared = SoundManager()
    private init() {}

    var isMuted: Bool {
        get { UserDefaults.standard.bool(forKey: "sound_muted") }
        set { UserDefaults.standard.set(newValue, forKey: "sound_muted") }
    }

    func playSuccess() { play(1057) }
    func playError()   { play(1053) }
    func playLose()    { play(1073) }

    private func play(_ id: SystemSoundID) {
        guard !isMuted else { return }
        AudioServicesPlaySystemSound(id)
    }
}
