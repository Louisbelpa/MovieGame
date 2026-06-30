package fr.guesstoday.data.prefs

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val prefs: SharedPreferences by lazy {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                "guesstoday_secure",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            // Fall back to plain SharedPreferences on encryption failure
            context.getSharedPreferences("guesstoday_fallback", Context.MODE_PRIVATE)
        }
    }

    var sessionToken: String?
        get() = prefs.getString(KEY_SESSION_TOKEN, null)
        set(value) {
            if (value != null) prefs.edit().putString(KEY_SESSION_TOKEN, value).apply()
            else prefs.edit().remove(KEY_SESSION_TOKEN).apply()
        }

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_SESSION_TOKEN = "session_token"
    }
}
