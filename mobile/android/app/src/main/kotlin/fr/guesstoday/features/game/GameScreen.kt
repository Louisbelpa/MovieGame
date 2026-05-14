package fr.guesstoday.features.game

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.*
import androidx.compose.ui.graphics.*
import androidx.compose.ui.layout.*
import androidx.compose.ui.platform.*
import androidx.compose.ui.text.font.*
import androidx.compose.ui.text.style.*
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import coil.request.ImageRequest
import fr.guesstoday.data.api.*
import fr.guesstoday.ui.theme.AppColors
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GameScreen(
    mode: GameMode,
    navController: NavController,
    vm: GameViewModel = hiltViewModel(),
) {
    val state by vm.uiState.collectAsState()
    val snackbarHost = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(mode) { vm.init(mode) }

    LaunchedEffect(state.error) {
        state.error?.let { scope.launch { snackbarHost.showSnackbar(it) } }
    }

    Scaffold(
        containerColor = AppColors.background,
        snackbarHost   = { SnackbarHost(snackbarHost) },
        topBar = {
            TopAppBar(
                title = {
                    Text(mode.label, color = AppColors.text, fontFamily = FontFamily.Serif)
                },
                actions = {
                    state.challenge?.let { c ->
                        Text("#${c.challengeNumber}", color = AppColors.textDim, fontSize = 13.sp,
                            modifier = Modifier.padding(end = 16.dp))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.background),
            )
        }
    ) { padding ->
        when {
            state.isLoading && state.challenge == null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = AppColors.gold)
                }
            }
            state.challenge == null && state.error != null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Button(
                        onClick = { vm.loadToday() },
                        colors = ButtonDefaults.buttonColors(containerColor = AppColors.gold)
                    ) { Text("Réessayer", color = AppColors.background) }
                }
            }
            else -> state.challenge?.let { challenge ->
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                ) {
                    // Date navigation bar
                    DateNavBar(challenge, state.viewingDate, vm)

                    // Image
                    ChallengeImage(
                        url = challenge.displayImageUrl,
                        blurRadius = challenge.blurRadius(challenge.attemptsUsed),
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )

                    // Wiki profile
                    challenge.profile?.let { profile ->
                        WikiProfileSection(profile, Modifier.padding(horizontal = 16.dp))
                    }

                    // Hints
                    if (challenge.hintsAvailable > 0) {
                        HintsSection(challenge, state.previousHintsRevealed)
                    }

                    // Attempts
                    AttemptsSection(challenge)

                    // Input (only for active today's game)
                    if (!challenge.isGameOver && !challenge.isPastChallenge) {
                        GuessInputSection(state, vm)
                    }

                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }

    // Win sheet
    if (state.showWin) {
        ResultBottomSheet(
            won         = true,
            challenge   = state.challenge!!,
            filmResult  = state.filmResult,
            wikiResult  = state.wikiResult,
            shareText   = vm.buildShareText(),
            onDismiss   = { vm.dismissWin() }
        )
    }

    // Lose sheet
    if (state.showLose) {
        ResultBottomSheet(
            won         = false,
            challenge   = state.challenge!!,
            filmResult  = state.filmResult,
            wikiResult  = state.wikiResult,
            shareText   = vm.buildShareText(),
            onDismiss   = { vm.dismissLose() }
        )
    }
}

// MARK: - Date Nav Bar

@Composable
private fun DateNavBar(challenge: ChallengePayload, viewingDate: String?, vm: GameViewModel) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(
            onClick  = { vm.navigatePrev() },
            enabled  = challenge.hasPrevChallenge
        ) {
            Icon(Icons.Default.ChevronLeft, contentDescription = "Précédent",
                tint = if (challenge.hasPrevChallenge) AppColors.text else AppColors.muted)
        }

        Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
            if (viewingDate != null) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(formatDate(viewingDate), color = AppColors.text, fontSize = 14.sp)
                    TextButton(onClick = { vm.returnToToday() }) {
                        Text("Retour à aujourd'hui", color = AppColors.gold, fontSize = 12.sp)
                    }
                }
            } else {
                Text("Aujourd'hui", color = AppColors.text, fontSize = 14.sp)
            }
        }

        IconButton(
            onClick = { vm.navigateNext() },
            enabled = challenge.hasNextChallenge && challenge.isPastChallenge
        ) {
            Icon(Icons.Default.ChevronRight, contentDescription = "Suivant",
                tint = if (challenge.hasNextChallenge && challenge.isPastChallenge) AppColors.text else AppColors.muted)
        }
    }
}

// MARK: - Challenge Image

@Composable
private fun ChallengeImage(url: String?, blurRadius: Float, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(220.dp)
            .clip(RoundedCornerShape(10.dp))
            .border(1.dp, AppColors.border, RoundedCornerShape(10.dp))
            .background(AppColors.surfaceAlt)
    ) {
        if (url != null) {
            AsyncImage(
                model    = ImageRequest.Builder(context).data(url).crossfade(true).build(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .blur(blurRadius.dp),
            )
        } else {
            Icon(Icons.Default.Photo, contentDescription = null,
                tint = AppColors.muted,
                modifier = Modifier.align(Alignment.Center).size(48.dp))
        }
    }
}

// MARK: - Wiki Profile

@Composable
private fun WikiProfileSection(profile: WikiProfile, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxWidth().padding(vertical = 8.dp),
        shape    = RoundedCornerShape(10.dp),
        color    = AppColors.surface,
        border   = BorderStroke(1.dp, AppColors.border)
    ) {
        Column(Modifier.padding(12.dp)) {
            when (profile.type) {
                "politician"  -> PoliticianProfile(profile)
                "sportsperson"-> SportspersonProfile(profile)
                else          -> GenericProfile(profile)
            }
        }
    }
}

@Composable private fun PoliticianProfile(p: WikiProfile) {
    Text("Fonctions", color = AppColors.gold, fontSize = 11.sp, fontWeight = FontWeight.Bold,
        letterSpacing = 0.8.sp, modifier = Modifier.padding(bottom = 8.dp))
    p.roles?.forEach { role ->
        Column(Modifier.padding(vertical = 3.dp)) {
            Text(role.title, color = AppColors.text, fontSize = 13.sp, fontWeight = FontWeight.Medium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                role.years?.let { Text(it, color = AppColors.textDim, fontSize = 11.sp) }
                role.country?.let { Text(it, color = AppColors.textDim, fontSize = 11.sp) }
            }
        }
    }
}

@Composable private fun SportspersonProfile(p: WikiProfile) {
    p.sport?.let { Text(it, color = AppColors.text, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(bottom = 8.dp)) }
    if (!p.clubs.isNullOrEmpty()) {
        Text("Clubs", color = AppColors.gold, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
        p.clubs.forEach { club ->
            Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
                Text(club.name, color = AppColors.text, fontSize = 13.sp, modifier = Modifier.weight(1f))
                club.years?.let { Text(it, color = AppColors.textDim, fontSize = 11.sp) }
            }
        }
    }
}

@Composable private fun GenericProfile(p: WikiProfile) {
    p.domain?.let { Text(it, color = AppColors.text, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(bottom = 8.dp)) }
    p.highlights?.forEach { h ->
        Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
            Text(h.label, color = AppColors.textDim, fontSize = 11.sp, modifier = Modifier.width(80.dp))
            Text(h.value, color = AppColors.text, fontSize = 13.sp, modifier = Modifier.weight(1f))
        }
    }
}

// MARK: - Hints

@Composable
private fun HintsSection(challenge: ChallengePayload, previousRevealed: Int) {
    Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        Text("INDICES", color = AppColors.textDim, fontSize = 10.sp,
            fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp,
            modifier = Modifier.padding(bottom = 8.dp))

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            modifier = Modifier.height(((challenge.hintsAvailable * 60).dp)),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement   = Arrangement.spacedBy(8.dp),
            userScrollEnabled = false,
        ) {
            items(challenge.hints) { hint ->
                HintCard(hint, isNew = challenge.hints.indexOf(hint) >= previousRevealed)
            }
            items(maxOf(0, challenge.hintsAvailable - challenge.hintsRevealed)) { i ->
                LockedHintCard(challenge.hintsRevealed + i)
            }
        }
    }
}

@Composable
private fun HintCard(hint: HintItem, isNew: Boolean) {
    Surface(
        shape  = RoundedCornerShape(10.dp),
        color  = AppColors.surface,
        border = BorderStroke(1.dp, if (isNew) AppColors.gold.copy(alpha = 0.6f) else AppColors.border),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(12.dp)) {
            Text(hint.displayLabel, color = AppColors.gold, fontSize = 10.sp,
                fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp,
                modifier = Modifier.padding(bottom = 4.dp))
            Text(hint.displayText, color = AppColors.text, fontSize = 13.sp,
                maxLines = if (hint.isSynopsis) 4 else 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun LockedHintCard(index: Int) {
    Surface(
        shape  = RoundedCornerShape(10.dp),
        color  = AppColors.surfaceAlt.copy(alpha = 0.5f),
        border = BorderStroke(1.dp, AppColors.border.copy(alpha = 0.4f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Lock, contentDescription = null,
                tint = AppColors.muted, modifier = Modifier.size(12.dp))
            Spacer(Modifier.width(6.dp))
            Text("Indice ${index + 1}", color = AppColors.muted, fontSize = 13.sp)
        }
    }
}

// MARK: - Attempts

@Composable
private fun AttemptsSection(challenge: ChallengePayload) {
    Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        Text("TENTATIVES", color = AppColors.textDim, fontSize = 10.sp,
            fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp,
            modifier = Modifier.padding(bottom = 8.dp))

        repeat(challenge.maxAttempts) { i ->
            val attempt = challenge.attempts.getOrNull(i)
            GuessRow(attempt, i, challenge.maxAttempts)
            if (i < challenge.maxAttempts - 1) Spacer(Modifier.height(6.dp))
        }
    }
}

@Composable
private fun GuessRow(attempt: AttemptEntry?, index: Int, maxAttempts: Int) {
    val isUsed    = attempt != null
    val isCorrect = attempt?.correct == true
    val isSkipped = attempt?.guess?.isEmpty() == true

    val bg = when {
        isCorrect -> AppColors.green.copy(alpha = 0.1f)
        isSkipped -> AppColors.surfaceAlt.copy(alpha = 0.5f)
        isUsed    -> AppColors.red.copy(alpha = 0.08f)
        else      -> AppColors.surfaceAlt.copy(alpha = 0.3f)
    }
    val borderColor = when {
        isCorrect -> AppColors.green.copy(alpha = 0.4f)
        isUsed && !isSkipped -> AppColors.red.copy(alpha = 0.3f)
        else -> AppColors.border.copy(alpha = 0.3f)
    }

    Surface(
        shape  = RoundedCornerShape(6.dp),
        color  = bg,
        border = BorderStroke(1.dp, borderColor),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("${index + 1}", color = if (isUsed) when { isCorrect -> AppColors.green; isSkipped -> AppColors.muted; else -> AppColors.red } else AppColors.muted,
                fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(22.dp))

            if (attempt != null) {
                Text(
                    text  = if (attempt.guess.isEmpty()) "Passé" else attempt.guess,
                    color = if (attempt.guess.isEmpty()) AppColors.textDim else AppColors.text,
                    fontSize = 14.sp, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis
                )
                val icon = when { isCorrect -> Icons.Default.CheckCircle; isSkipped -> Icons.Default.SkipNext; else -> Icons.Default.Cancel }
                val tint = when { isCorrect -> AppColors.green; isSkipped -> AppColors.muted; else -> AppColors.red }
                Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp))
            } else {
                HorizontalDivider(color = AppColors.surfaceAlt, modifier = Modifier.weight(1f))
            }
        }
    }
}

// MARK: - Guess Input

@Composable
private fun GuessInputSection(state: GameUiState, vm: GameViewModel) {
    Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        // Attempt tracker dots
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            val c = state.challenge ?: return@Row
            repeat(c.maxAttempts) { i ->
                Box(Modifier.size(8.dp).clip(CircleShape)
                    .background(if (i < c.attemptsUsed) AppColors.red else AppColors.surfaceAlt))
                if (i < c.maxAttempts - 1) Spacer(Modifier.width(6.dp))
            }
            Spacer(Modifier.weight(1f))
            val remaining = (state.challenge?.maxAttempts ?: 0) - (state.challenge?.attemptsUsed ?: 0)
            Text("$remaining restante${if (remaining > 1) "s" else ""}", color = AppColors.textDim, fontSize = 12.sp)
        }

        Spacer(Modifier.height(8.dp))

        // Text field + dropdown
        Box {
            OutlinedTextField(
                value         = state.inputText,
                onValueChange = { vm.onInputChange(it) },
                placeholder   = { Text("Votre réponse…", color = AppColors.muted) },
                modifier      = Modifier.fillMaxWidth(),
                colors        = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor   = AppColors.gold.copy(alpha = 0.5f),
                    unfocusedBorderColor = AppColors.border,
                    focusedTextColor     = AppColors.text,
                    unfocusedTextColor   = AppColors.text,
                    cursorColor          = AppColors.gold,
                    containerColor       = AppColors.surface,
                ),
                trailingIcon  = {
                    if (state.isSearching) CircularProgressIndicator(Modifier.size(18.dp), color = AppColors.gold, strokeWidth = 2.dp)
                },
                singleLine    = true,
            )

            if (state.searchResults.isNotEmpty()) {
                Surface(
                    modifier = Modifier.fillMaxWidth().offset(y = 56.dp).zIndex(10f),
                    shape    = RoundedCornerShape(10.dp),
                    color    = AppColors.surfaceAlt,
                    border   = BorderStroke(1.dp, AppColors.border),
                    shadowElevation = 8.dp,
                ) {
                    Column {
                        state.searchResults.forEachIndexed { i, item ->
                            TextButton(
                                onClick = { vm.selectSearchResult(item) },
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.Start) {
                                    Text(item.title, color = AppColors.text, fontSize = 14.sp)
                                    item.year?.let { Text("$it", color = AppColors.textDim, fontSize = 12.sp) }
                                }
                            }
                            if (i < state.searchResults.size - 1) {
                                HorizontalDivider(color = AppColors.border)
                            }
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(
                onClick  = { vm.skipAttempt() },
                modifier = Modifier.weight(1f),
                colors   = ButtonDefaults.outlinedButtonColors(contentColor = AppColors.text),
                border   = BorderStroke(1.dp, AppColors.border),
            ) { Text("Passer") }

            Button(
                onClick  = { vm.submitGuess(state.inputText) },
                modifier = Modifier.weight(1f),
                enabled  = state.inputText.isNotBlank(),
                colors   = ButtonDefaults.buttonColors(
                    containerColor         = AppColors.gold,
                    contentColor           = AppColors.background,
                    disabledContainerColor = AppColors.surfaceAlt,
                )
            ) { Text("Deviner", fontWeight = FontWeight.SemiBold) }
        }
    }
}

// MARK: - Result Bottom Sheet

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ResultBottomSheet(
    won: Boolean,
    challenge: ChallengePayload,
    filmResult: ChallengeResult?,
    wikiResult: WikiResult?,
    shareText: String,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor   = AppColors.background,
        dragHandle = { BottomSheetDefaults.DragHandle(color = AppColors.border) }
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp).verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(if (won) "🎉" else "💀", fontSize = 48.sp)
            Spacer(Modifier.height(8.dp))
            Text(
                text  = if (won) "Bravo !" else "Raté !",
                style = MaterialTheme.typography.headlineMedium,
                color = if (won) AppColors.gold else AppColors.red,
            )
            Text(
                text  = "En ${challenge.attemptsUsed} tentative${if (challenge.attemptsUsed > 1) "s" else ""}",
                color = AppColors.textDim, fontSize = 14.sp,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            filmResult?.let { FilmResultCard(it) }
            wikiResult?.let { WikiResultCard(it) }

            Spacer(Modifier.height(16.dp))

            // Share button
            val shareIntent = android.content.Intent.createChooser(
                android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(android.content.Intent.EXTRA_TEXT, shareText)
                },
                "Partager"
            )
            Button(
                onClick  = { context.startActivity(shareIntent) },
                modifier = Modifier.fillMaxWidth(),
                colors   = ButtonDefaults.buttonColors(
                    containerColor = if (won) AppColors.gold else AppColors.surface,
                    contentColor   = if (won) AppColors.background else AppColors.text,
                )
            ) {
                Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Partager mon résultat")
            }

            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = onDismiss, modifier = Modifier.fillMaxWidth(),
                border  = BorderStroke(1.dp, AppColors.border),
                colors  = ButtonDefaults.outlinedButtonColors(contentColor = AppColors.text)
            ) { Text("Fermer") }

            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
private fun FilmResultCard(result: ChallengeResult) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape    = RoundedCornerShape(10.dp),
        color    = AppColors.surface,
        border   = BorderStroke(1.dp, AppColors.border)
    ) {
        Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            val ctx = LocalContext.current
            AsyncImage(
                model   = ImageRequest.Builder(ctx).data(result.imageUrl).crossfade(true).build(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.width(70.dp).height(105.dp).clip(RoundedCornerShape(6.dp))
            )
            Column(Modifier.weight(1f)) {
                Text(result.title, color = AppColors.text, fontSize = 16.sp, fontFamily = FontFamily.Serif, fontWeight = FontWeight.SemiBold)
                result.year?.let { Text("$it", color = AppColors.textDim, fontSize = 13.sp) }
                (result.director ?: result.creator)?.let { Text(it, color = AppColors.textDim, fontSize = 13.sp) }
                result.genres?.let { genres ->
                    Text(genres.joinToString(" · "), color = AppColors.textDim, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun WikiResultCard(result: WikiResult) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape    = RoundedCornerShape(10.dp),
        color    = AppColors.surface,
        border   = BorderStroke(1.dp, AppColors.border)
    ) {
        Column(Modifier.padding(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                result.photoUrl?.let { url ->
                    val ctx = LocalContext.current
                    AsyncImage(
                        model   = ImageRequest.Builder(ctx).data(url).crossfade(true).build(),
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(72.dp).clip(CircleShape)
                    )
                }
                Column(Modifier.weight(1f)) {
                    Text(result.name, color = AppColors.text, fontSize = 16.sp, fontFamily = FontFamily.Serif, fontWeight = FontWeight.SemiBold)
                    Text(personTypeLabel(result.personType), color = AppColors.gold, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
            result.bio?.let { Spacer(Modifier.height(8.dp)); Text(it, color = AppColors.textDim, fontSize = 13.sp, maxLines = 4, overflow = TextOverflow.Ellipsis) }
        }
    }
}

private fun personTypeLabel(type: String) = when (type) {
    "politician"        -> "Personnalité politique"
    "sportsperson"      -> "Sportif·ve"
    "artist"            -> "Artiste"
    "scientist"         -> "Scientifique"
    "entrepreneur"      -> "Entrepreneur·se"
    "writer"            -> "Écrivain·e"
    "historical_figure" -> "Figure historique"
    else                -> "Personnalité"
}

private fun formatDate(date: String): String {
    return try {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.FRANCE)
        val d = sdf.parse(date) ?: return date
        java.text.SimpleDateFormat("d MMMM yyyy", java.util.Locale.FRANCE).format(d)
    } catch (e: Exception) { date }
}
