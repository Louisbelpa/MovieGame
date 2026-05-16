package fr.guesstoday.features.game

import android.content.Context
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.*
import androidx.compose.ui.text.font.*
import androidx.compose.ui.unit.*
import fr.guesstoday.ui.theme.AppColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RulesSheet(mode: GameMode, onDismiss: () -> Unit) {
    val ctx = LocalContext.current
    var appeared by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { appeared = true }

    ModalBottomSheet(
        onDismissRequest = {
            markRulesSeen(ctx, mode)
            onDismiss()
        },
        containerColor = AppColors.background,
        dragHandle = { BottomSheetDefaults.DragHandle(color = AppColors.border) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Mode icon
            val scale by animateFloatAsState(
                targetValue  = if (appeared) 1f else 0.5f,
                animationSpec = spring(dampingRatio = 0.65f, stiffness = Spring.StiffnessMediumLow),
                label        = "icon_scale"
            )
            Box(
                modifier = Modifier
                    .scale(scale)
                    .alpha(if (appeared) 1f else 0f)
                    .padding(top = 8.dp, bottom = 12.dp)
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(modeColor(mode).copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(modeIcon(mode), contentDescription = null, tint = modeColor(mode), modifier = Modifier.size(36.dp))
            }

            // Title
            AnimatedVisibility(visible = appeared, enter = fadeIn() + slideInVertically { it / 3 }) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "COMMENT JOUER",
                        color    = AppColors.textDim,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 1.2.sp,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        mode.label,
                        color      = AppColors.text,
                        fontSize   = 24.sp,
                        fontFamily = FontFamily.Serif,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            // Rules
            val rules = modeRules(mode)
            rules.forEachIndexed { i, rule ->
                val delay = 100 + i * 70
                var visible by remember { mutableStateOf(false) }
                LaunchedEffect(appeared) {
                    if (appeared) {
                        kotlinx.coroutines.delay(delay.toLong())
                        visible = true
                    }
                }
                AnimatedVisibility(visible = visible, enter = fadeIn() + slideInVertically { it / 2 }) {
                    RuleRow(number = i + 1, text = rule, modifier = Modifier.padding(bottom = 8.dp))
                }
            }

            // Hint legend (film / series only)
            if (!mode.isWiki) {
                Spacer(Modifier.height(4.dp))
                HintLegend()
                Spacer(Modifier.height(16.dp))
            }

            Spacer(Modifier.height(8.dp))

            // CTA
            Button(
                onClick = {
                    markRulesSeen(ctx, mode)
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth(),
                colors   = ButtonDefaults.buttonColors(containerColor = AppColors.gold, contentColor = Color(0xFF1A0F00)),
                shape    = RoundedCornerShape(10.dp),
            ) {
                Text("C'est parti !", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
        }
    }
}

fun rulesAlreadySeen(ctx: Context, mode: GameMode): Boolean {
    val prefs = ctx.getSharedPreferences("game_stats", Context.MODE_PRIVATE)
    return prefs.getBoolean("rules_seen_${mode.statsKey}", false)
}

private fun markRulesSeen(ctx: Context, mode: GameMode) {
    ctx.getSharedPreferences("game_stats", Context.MODE_PRIVATE)
        .edit().putBoolean("rules_seen_${mode.statsKey}", true).apply()
}

@Composable
private fun RuleRow(number: Int, text: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(AppColors.surface)
            .border(1.dp, AppColors.border, RoundedCornerShape(10.dp))
            .padding(12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(CircleShape)
                .background(AppColors.gold.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center
        ) {
            Text("$number", color = AppColors.gold, fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
        }
        Text(text, color = AppColors.text, fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun HintLegend() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(AppColors.surface)
            .border(1.dp, AppColors.border, RoundedCornerShape(10.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            "LÉGENDE DES TENTATIVES",
            color    = AppColors.textDim,
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 1.sp,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            LegendItem(color = AppColors.green, symbol = "●", label = "Bonne réponse")
            LegendItem(color = AppColors.red,   symbol = "●", label = "Mauvaise réponse")
            LegendItem(color = AppColors.muted, symbol = "○", label = "Tour passé")
        }
    }
}

@Composable
private fun LegendItem(color: Color, symbol: String, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(symbol, color = color, fontSize = 10.sp)
        Text(label, color = AppColors.textDim, fontSize = 11.sp)
    }
}

private fun modeIcon(mode: GameMode): ImageVector = when (mode) {
    GameMode.FILM -> Icons.Default.Movie
    GameMode.WIKI -> Icons.Default.AccountBalance
    else          -> Icons.Default.Tv
}

private fun modeColor(mode: GameMode): Color = when (mode) {
    GameMode.FILM -> AppColors.modeFilm
    GameMode.WIKI -> AppColors.modeWiki
    else          -> Color(0xFF6B7CFF)
}

private fun modeRules(mode: GameMode): List<String> = when (mode) {
    GameMode.FILM -> listOf(
        "Devinez le film mystère du jour.",
        "L'image est floue au départ — elle se dévoile progressivement à chaque mauvaise réponse.",
        "Jusqu'à 3 indices sont révélés : année, réalisateur, acteur principal…",
        "Vous avez 5 tentatives. Utilisez la barre de recherche pour proposer un titre.",
        "Un nouveau défi chaque jour à minuit (heure de Paris) !",
    )
    GameMode.WIKI -> listOf(
        "Devinez la personnalité mystère du jour.",
        "Sa photo reste masquée jusqu'à la fin de la partie.",
        "Des indices sur sa carrière, ses fonctions ou ses clubs sont révélés progressivement.",
        "Vous avez 5 tentatives. Utilisez la barre de recherche pour proposer un nom.",
        "Un nouveau défi chaque jour à minuit (heure de Paris) !",
    )
    else -> listOf(
        "Devinez la série mystère du jour.",
        "L'image est floue au départ — elle se dévoile progressivement à chaque mauvaise réponse.",
        "Jusqu'à 3 indices sont révélés : année, créateur, acteur principal…",
        "Vous avez 5 tentatives. Utilisez la barre de recherche pour proposer un titre.",
        "Un nouveau défi chaque jour à minuit (heure de Paris) !",
    )
}

private val GameMode.isWiki: Boolean get() = this == GameMode.WIKI
