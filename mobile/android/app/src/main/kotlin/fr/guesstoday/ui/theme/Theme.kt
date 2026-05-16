package fr.guesstoday.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary          = FilmGold,
    onPrimary        = FilmBlack,
    secondary        = FilmGoldLight,
    onSecondary      = FilmBlack,
    background       = FilmBlack,
    onBackground     = FilmText,
    surface          = FilmDark,
    onSurface        = FilmText,
    surfaceVariant   = FilmGray,
    onSurfaceVariant = FilmTextDim,
    outline          = FilmBorder,
    error            = FilmRed,
    onError          = FilmText,
)

@Composable
fun GuessTodayTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography  = GuessTodayTypography,
        content     = content
    )
}

// Convenience aliases used across the app
object AppColors {
    val background  = FilmBlack
    val surface     = FilmDark
    val surfaceAlt  = FilmGray
    val border      = FilmBorder
    val muted       = FilmMuted
    val text        = FilmText
    val textDim     = FilmTextDim
    val gold        = FilmGold
    val goldLight   = FilmGoldLight
    val goldDeep    = FilmGoldDeep
    val green       = FilmGreen
    val red         = FilmRed
    val amber       = FilmAmber
    // Mode accents
    val modeFilm    = ModeFilm
    val modeSeries  = ModeSeries
    val modeWiki    = ModeWiki
}

// Gold gradient brush (top → bottom), reusable
val GoldGradient = androidx.compose.ui.graphics.Brush.verticalGradient(
    colors = listOf(FilmGoldLight, FilmGold, FilmGoldDeep)
)
