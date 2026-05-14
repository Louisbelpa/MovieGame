package fr.guesstoday.data.push

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import fr.guesstoday.GuessTodayApp
import fr.guesstoday.MainActivity
import fr.guesstoday.R
import fr.guesstoday.data.api.ApiService
import fr.guesstoday.data.prefs.SessionManager
import kotlinx.coroutines.*
import javax.inject.Inject

@AndroidEntryPoint
class PushNotificationService : FirebaseMessagingService() {

    @Inject lateinit var api: ApiService
    @Inject lateinit var sessionManager: SessionManager

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        if (sessionManager.sessionToken != null) {
            scope.launch {
                runCatching { api.registerPushToken(PushTokenBody(token, "android")) }
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: "GuessToday"
        val body  = message.notification?.body  ?: "Un nouveau défi vous attend !"

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, GuessTodayApp.CHANNEL_DAILY)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        getSystemService(NotificationManager::class.java)
            .notify(1, notification)
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}

data class PushTokenBody(val token: String, val platform: String)
