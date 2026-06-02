package fr.guesstoday.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// MARK: - Challenge

@JsonClass(generateAdapter = true)
data class ChallengePayload(
    @Json(name = "challengeId")      val challengeId: Int,
    @Json(name = "challengeNumber")  val challengeNumber: Int,
    @Json(name = "date")             val date: String,
    @Json(name = "isPastChallenge")  val isPastChallenge: Boolean,
    @Json(name = "mediaType")        val mediaType: String,
    @Json(name = "hasPrevChallenge") val hasPrevChallenge: Boolean,
    @Json(name = "hasNextChallenge") val hasNextChallenge: Boolean,
    @Json(name = "isGameOver")       val isGameOver: Boolean,
    @Json(name = "hintsAvailable")   val hintsAvailable: Int,
    @Json(name = "hintsRevealed")    val hintsRevealed: Int,
    @Json(name = "hints")            val hints: List<HintItem>,
    @Json(name = "attemptsUsed")     val attemptsUsed: Int,
    @Json(name = "maxAttempts")      val maxAttempts: Int,
    @Json(name = "attempts")         val attempts: List<AttemptEntry>,
    @Json(name = "outcome")          val outcome: String?,
    // Film / series
    @Json(name = "imageUrl")         val imageUrl: String?,
    // Wiki
    @Json(name = "personType")       val personType: String?,
    @Json(name = "photoUrl")         val photoUrl: String?,
    @Json(name = "profile")          val profile: WikiProfile?,
) {
    val isWiki: Boolean get() = mediaType == "wiki"
    val displayImageUrl: String? get() = if (isWiki) photoUrl else imageUrl
    val won: Boolean get() = outcome == "won"
    val lost: Boolean get() = outcome == "lost"

    fun blurRadius(attemptsUsed: Int): Float {
        val levels = floatArrayOf(22f, 16f, 11f, 7f, 3f, 0f)
        return levels.getOrElse(attemptsUsed) { 0f }
    }
}

@JsonClass(generateAdapter = true)
data class HintItem(
    @Json(name = "type")  val type: String,
    @Json(name = "value") val value: Any?,  // String, List<String>, Int, or null
) {
    val displayLabel: String get() = when (type) {
        "year"              -> "Année"
        "director"          -> "Réalisateur"
        "creator"           -> "Créateur"
        "genres"            -> "Genres"
        "cast"              -> "Acteur principal"
        "synopsis"          -> "Synopsis"
        "tagline"           -> "Accroche"
        "wiki_birth_year"   -> "Année de naissance"
        "wiki_nationality"  -> "Nationalité"
        "wiki_party"        -> "Parti"
        "wiki_sport"        -> "Sport"
        "wiki_domain"       -> "Domaine"
        "wiki_notable_work" -> "Œuvre notable"
        "wiki_name_initials"-> "Initiales"
        "wiki_name_length"  -> "Lettres dans le nom"
        else                -> type.removePrefix("wiki_").replaceFirstChar { it.uppercase() }
    }

    @Suppress("UNCHECKED_CAST")
    val displayText: String get() = when (value) {
        null          -> ""
        is String     -> value
        is Number     -> value.toString()
        is List<*>    -> (value as? List<String>)?.joinToString(" · ") ?: ""
        else          -> value.toString()
    }

    val isSynopsis: Boolean get() = type == "synopsis"
}

@JsonClass(generateAdapter = true)
data class AttemptEntry(
    @Json(name = "guess")   val guess: String,
    @Json(name = "correct") val correct: Boolean,
)

@JsonClass(generateAdapter = true)
data class GuessResponse(
    @Json(name = "correct")      val correct: Boolean,
    @Json(name = "outcome")      val outcome: String?,
    @Json(name = "attemptsLeft") val attemptsLeft: Int,
    @Json(name = "payload")      val payload: ChallengePayload,
)

// MARK: - Wiki Profile

@JsonClass(generateAdapter = true)
data class WikiProfile(
    @Json(name = "type")             val type: String,
    @Json(name = "roles")            val roles: List<WikiRole>?,
    @Json(name = "clubs")            val clubs: List<WikiClub>?,
    @Json(name = "clubsYouth")       val clubsYouth: List<WikiClub>?,
    @Json(name = "sport")            val sport: String?,
    @Json(name = "careerHighlights") val careerHighlights: List<String>?,
    @Json(name = "nationalTeam")     val nationalTeam: String?,
    @Json(name = "domain")           val domain: String?,
    @Json(name = "notableWork")      val notableWork: String?,
    @Json(name = "era")              val era: String?,
    @Json(name = "company")          val company: String?,
    @Json(name = "highlights")       val highlights: List<WikiHighlight>?,
)

@JsonClass(generateAdapter = true)
data class WikiRole(
    @Json(name = "title")       val title: String,
    @Json(name = "years")       val years: String?,
    @Json(name = "country")     val country: String?,
    @Json(name = "predecessor") val predecessor: String?,
    @Json(name = "successor")   val successor: String?,
)

@JsonClass(generateAdapter = true)
data class WikiClub(
    @Json(name = "name")  val name: String,
    @Json(name = "years") val years: String?,
    @Json(name = "apps")  val apps: Int?,
    @Json(name = "goals") val goals: Int?,
)

@JsonClass(generateAdapter = true)
data class WikiHighlight(
    @Json(name = "label") val label: String,
    @Json(name = "value") val value: String,
)

// MARK: - Results

@JsonClass(generateAdapter = true)
data class ChallengeResult(
    @Json(name = "title")     val title: String,
    @Json(name = "year")      val year: Int?,
    @Json(name = "director")  val director: String?,
    @Json(name = "creator")   val creator: String?,
    @Json(name = "genres")    val genres: List<String>?,
    @Json(name = "synopsis")  val synopsis: String?,
    @Json(name = "imageUrl")  val imageUrl: String,
    @Json(name = "tmdbId")    val tmdbId: Int?,
    @Json(name = "status")    val status: String?,
    @Json(name = "mediaType") val mediaType: String,
)

@JsonClass(generateAdapter = true)
data class WikiResult(
    @Json(name = "name")         val name: String,
    @Json(name = "personType")   val personType: String,
    @Json(name = "bio")          val bio: String?,
    @Json(name = "photoUrl")     val photoUrl: String?,
    @Json(name = "wikipediaUrl") val wikipediaUrl: String?,
)

// MARK: - Auth

@JsonClass(generateAdapter = true)
data class User(
    @Json(name = "id")             val id: Int,
    @Json(name = "email")          val email: String?,
    @Json(name = "displayName")    val displayName: String,
    @Json(name = "avatarUrl")      val avatarUrl: String?,
    @Json(name = "emailVerified")  val emailVerified: Boolean?,
)

@JsonClass(generateAdapter = true)
data class AuthResponse(
    @Json(name = "user")         val user: User,
    @Json(name = "sessionToken") val sessionToken: String,
)

@JsonClass(generateAdapter = true)
data class MeResponse(
    @Json(name = "user") val user: User?,
)

// MARK: - Search

@JsonClass(generateAdapter = true)
data class SearchResponse(
    @Json(name = "results") val results: List<SearchResultItem>,
)

@JsonClass(generateAdapter = true)
data class SearchResultItem(
    @Json(name = "id")         val id: Int?,
    @Json(name = "title")      val title: String,
    @Json(name = "year")       val year: Int?,
    @Json(name = "personType") val personType: String?,
) {
    val displayTitle: String get() = if (year != null) "$title ($year)" else title
}

// MARK: - Friends

@JsonClass(generateAdapter = true)
data class FriendEntry(
    @Json(name = "userId")       val userId: Int,
    @Json(name = "displayName")  val displayName: String,
    @Json(name = "avatarUrl")    val avatarUrl: String?,
    @Json(name = "status")       val status: String,
    @Json(name = "result")       val result: String?,
    @Json(name = "attemptsUsed") val attemptsUsed: Int?,
) {
    val isPending: Boolean get() = status == "pending_received"
    val isSent: Boolean    get() = status == "pending_sent"
    val isFriend: Boolean  get() = status == "friend"
}

@JsonClass(generateAdapter = true)
data class FriendsPayload(
    @Json(name = "friends")  val friends: List<FriendEntry>,
    @Json(name = "yourCode") val yourCode: String,
)

// MARK: - Archive

@JsonClass(generateAdapter = true)
data class DatesPayload(
    @Json(name = "dates") val dates: List<String>,
)

@JsonClass(generateAdapter = true)
data class AdjacentDatePayload(
    @Json(name = "date") val date: String?,
)

// MARK: - Leaderboard

@JsonClass(generateAdapter = true)
data class LeaderboardEntry(
    @Json(name = "id")            val id: Int,
    @Json(name = "displayName")   val displayName: String,
    @Json(name = "avatarUrl")     val avatarUrl: String?,
    @Json(name = "isMe")          val isMe: Boolean,
    @Json(name = "rank")          val rank: Int,
    @Json(name = "totalWins")     val totalWins: Int,
    @Json(name = "totalPlayed")   val totalPlayed: Int,
    @Json(name = "winRate")       val winRate: Float,
    @Json(name = "filmWins")      val filmWins: Int,
    @Json(name = "seriesWins")    val seriesWins: Int,
    @Json(name = "wikiWins")      val wikiWins: Int,
    @Json(name = "currentStreak") val currentStreak: Int,
    @Json(name = "maxStreak")     val maxStreak: Int,
)

@JsonClass(generateAdapter = true)
data class LeaderboardPayload(
    @Json(name = "leaderboard") val leaderboard: List<LeaderboardEntry>,
)

// MARK: - Misc

@JsonClass(generateAdapter = true)
data class OkResponse(
    @Json(name = "ok") val ok: Boolean,
)
