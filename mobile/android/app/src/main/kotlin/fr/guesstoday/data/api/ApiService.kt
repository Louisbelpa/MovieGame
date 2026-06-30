package fr.guesstoday.data.api

import com.squareup.moshi.JsonClass
import retrofit2.http.*

interface ApiService {

    // MARK: - Challenge

    @GET("/api/challenge/today")
    suspend fun todayChallenge(@Query("type") type: String = "film"): ChallengePayload

    @GET("/api/challenge/date/{date}")
    suspend fun challengeForDate(@Path("date") date: String, @Query("type") type: String = "film"): ChallengePayload

    @POST("/api/challenge/guess")
    suspend fun submitGuess(@Body body: GuessBody): GuessResponse

    @GET("/api/challenge/result")
    suspend fun challengeResult(@Query("challengeId") challengeId: Int): ChallengeResult

    @GET("/api/films/search")
    suspend fun searchFilms(@Query("q") query: String, @Query("limit") limit: Int = 8): SearchResponse

    @GET("/api/series/search")
    suspend fun searchSeries(@Query("q") query: String, @Query("limit") limit: Int = 8): SearchResponse

    @GET("/api/challenge/dates")
    suspend fun challengeDates(@Query("days") days: Int = 365, @Query("type") type: String = "film"): DatesPayload

    @GET("/api/challenge/adjacent")
    suspend fun adjacentDate(@Query("date") date: String, @Query("direction") direction: String, @Query("type") type: String = "film"): AdjacentDatePayload

    // MARK: - Wiki

    @GET("/api/wiki/today")
    suspend fun todayWikiChallenge(): ChallengePayload

    @GET("/api/wiki/date/{date}")
    suspend fun wikiChallengeForDate(@Path("date") date: String): ChallengePayload

    @POST("/api/wiki/guess")
    suspend fun submitWikiGuess(@Body body: GuessBody): GuessResponse

    @GET("/api/wiki/result")
    suspend fun wikiResult(@Query("challengeId") challengeId: Int): WikiResult

    @GET("/api/wiki/search")
    suspend fun searchWikiPersons(@Query("q") query: String, @Query("limit") limit: Int = 8): SearchResponse

    @GET("/api/wiki/dates")
    suspend fun wikiDates(@Query("days") days: Int = 365): DatesPayload

    // MARK: - Auth

    @POST("/api/auth/login")
    suspend fun login(@Body body: LoginBody): AuthResponse

    @POST("/api/auth/register")
    suspend fun register(@Body body: RegisterBody): AuthResponse

    @GET("/api/auth/me")
    suspend fun me(): MeResponse

    @POST("/api/auth/logout")
    suspend fun logout(): OkResponse

    @PUT("/api/auth/profile")
    suspend fun updateProfile(@Body body: UpdateProfileBody): UserWrapper

    @POST("/api/auth/change-password")
    suspend fun changePassword(@Body body: ChangePasswordBody): OkResponse

    @POST("/api/auth/forgot-password")
    suspend fun forgotPassword(@Body body: EmailBody): OkResponse

    @POST("/api/auth/oauth/callback")
    suspend fun oauthCallback(@Body body: OAuthCallbackBody): AuthResponse

    @POST("/api/auth/push-token")
    suspend fun registerPushToken(@Body body: PushTokenBody): OkResponse

    // MARK: - Friends

    @GET("/api/friends")
    suspend fun friends(@Query("date") date: String? = null): FriendsPayload

    @POST("/api/friends/add")
    suspend fun addFriend(@Body body: FriendCodeBody): OkResponse

    @POST("/api/friends/accept")
    suspend fun acceptFriend(@Body body: FriendUserIdBody): OkResponse

    @DELETE("/api/friends/{userId}")
    suspend fun removeFriend(@Path("userId") userId: Int): OkResponse

    @GET("/api/friends/leaderboard")
    suspend fun friendsLeaderboard(): LeaderboardPayload
}

// MARK: - Request bodies

@JsonClass(generateAdapter = true)
data class GuessBody(val challengeId: Int, val guess: String)

@JsonClass(generateAdapter = true)
data class LoginBody(val email: String, val password: String)

@JsonClass(generateAdapter = true)
data class RegisterBody(val email: String, val password: String, val displayName: String)

@JsonClass(generateAdapter = true)
data class UpdateProfileBody(val displayName: String? = null, val avatarUrl: String? = null)

@JsonClass(generateAdapter = true)
data class ChangePasswordBody(val currentPassword: String, val newPassword: String)

@JsonClass(generateAdapter = true)
data class EmailBody(val email: String)

@JsonClass(generateAdapter = true)
data class PushTokenBody(val token: String, val platform: String)

@JsonClass(generateAdapter = true)
data class FriendCodeBody(val code: String)

@JsonClass(generateAdapter = true)
data class FriendUserIdBody(val userId: Int)

@JsonClass(generateAdapter = true)
data class UserWrapper(val user: User)

@JsonClass(generateAdapter = true)
data class OAuthCallbackBody(
    val provider: String,
    val providerId: String,
    val email: String,
    val displayName: String,
    val avatarUrl: String? = null,
)
