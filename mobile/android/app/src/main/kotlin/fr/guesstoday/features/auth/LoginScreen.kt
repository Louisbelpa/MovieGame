package fr.guesstoday.features.auth

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.*
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import fr.guesstoday.ui.theme.AppColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    navController: NavController,
    authViewModel: AuthViewModel = hiltViewModel(),
) {
    val state by authViewModel.uiState.collectAsState()
    var email    by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    val context = LocalContext.current
    // TODO: Replace with your Android Google Client ID from the Google Cloud Console
    val googleSignInClient = remember {
        GoogleSignIn.getClient(
            context,
            GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestProfile()
                .requestId()
                .build()
        )
    }
    val googleLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val account = GoogleSignIn.getSignedInAccountFromIntent(result.data).result
            account?.let { authViewModel.loginWithGoogle(it) { navController.popBackStack() } }
        }
    }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            TopAppBar(
                title = { Text("Connexion", color = AppColors.text) },
                navigationIcon = {
                    TextButton(onClick = { navController.popBackStack() }) {
                        Text("Annuler", color = AppColors.textDim)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.background),
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Spacer(Modifier.height(8.dp))

            // Title
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text("GuessToday", color = AppColors.gold, fontSize = 28.sp, fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold)
                Text("Connectez-vous pour sauvegarder vos stats", color = AppColors.textDim, fontSize = 14.sp)
            }

            Spacer(Modifier.height(8.dp))

            GTextField("Email", email, { email = it }, KeyboardType.Email, ImeAction.Next)
            GTextField("Mot de passe", password, { password = it }, KeyboardType.Password, ImeAction.Done, isPassword = true)

            state.error?.let { Text(it, color = AppColors.red, fontSize = 13.sp) }

            GButton(
                text      = "Se connecter",
                isLoading = state.isLoading,
                enabled   = email.isNotBlank() && password.isNotBlank(),
                onClick   = { authViewModel.login(email.lowercase(), password) { navController.popBackStack() } }
            )

            TextButton(
                onClick  = { navController.navigate("forgotPassword") },
                modifier = Modifier.align(Alignment.CenterHorizontally)
            ) { Text("Mot de passe oublié ?", color = AppColors.textDim, fontSize = 13.sp) }

            HorizontalDivider(color = AppColors.border)

            GoogleSignInButton(onClick = { googleLauncher.launch(googleSignInClient.signInIntent) })

            GOutlinedButton(
                text    = "Créer un compte",
                onClick = { navController.navigate("register") }
            )

            Spacer(Modifier.height(24.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    navController: NavController,
    authViewModel: AuthViewModel = hiltViewModel(),
) {
    val state by authViewModel.uiState.collectAsState()
    var name     by remember { mutableStateOf("") }
    var email    by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            TopAppBar(
                title = { Text("Inscription", color = AppColors.text) },
                navigationIcon = {
                    TextButton(onClick = { navController.popBackStack() }) {
                        Text("Retour", color = AppColors.textDim)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.background),
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Spacer(Modifier.height(8.dp))

            GTextField("Pseudo", name, { name = it }, KeyboardType.Text, ImeAction.Next)
            GTextField("Email", email, { email = it }, KeyboardType.Email, ImeAction.Next)
            GTextField("Mot de passe", password, { password = it }, KeyboardType.Password, ImeAction.Done, isPassword = true)

            state.error?.let { Text(it, color = AppColors.red, fontSize = 13.sp) }

            GButton(
                text      = "Créer mon compte",
                isLoading = state.isLoading,
                enabled   = name.isNotBlank() && email.isNotBlank() && password.isNotBlank(),
                onClick   = {
                    authViewModel.register(email.lowercase(), password, name.trim()) {
                        // Pop both register and login screens in one call to avoid empty-stack crash
                        navController.popBackStack("login", inclusive = true)
                    }
                }
            )

            Spacer(Modifier.height(24.dp))
        }
    }
}

// MARK: - Shared components

@Composable
fun GTextField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    isPassword: Boolean = false,
) {
    OutlinedTextField(
        value         = value,
        onValueChange = onChange,
        label         = { Text(label, color = AppColors.muted) },
        modifier      = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
        singleLine    = true,
        colors        = OutlinedTextFieldDefaults.colors(
            focusedBorderColor   = AppColors.gold.copy(alpha = 0.5f),
            unfocusedBorderColor = AppColors.border,
            focusedTextColor     = AppColors.text,
            unfocusedTextColor   = AppColors.text,
            focusedLabelColor    = AppColors.gold,
            cursorColor          = AppColors.gold,
            containerColor       = AppColors.surface,
        )
    )
}

@Composable
fun GButton(text: String, onClick: () -> Unit, isLoading: Boolean = false, enabled: Boolean = true) {
    Button(
        onClick  = onClick,
        modifier = Modifier.fillMaxWidth().height(50.dp),
        enabled  = enabled && !isLoading,
        colors   = ButtonDefaults.buttonColors(
            containerColor         = AppColors.gold,
            contentColor           = AppColors.background,
            disabledContainerColor = AppColors.surfaceAlt,
            disabledContentColor   = AppColors.textDim,
        ),
        shape    = RoundedCornerShape(10.dp),
    ) {
        if (isLoading) {
            CircularProgressIndicator(Modifier.size(20.dp), color = AppColors.background, strokeWidth = 2.dp)
        } else {
            Text(text, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
        }
    }
}

@Composable
fun GOutlinedButton(text: String, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().height(50.dp),
        border   = BorderStroke(1.dp, AppColors.border),
        shape    = RoundedCornerShape(10.dp),
        colors   = ButtonDefaults.outlinedButtonColors(contentColor = AppColors.text),
    ) {
        Text(text, fontWeight = FontWeight.Medium, fontSize = 15.sp)
    }
}

@Composable
fun GoogleSignInButton(onClick: () -> Unit) {
    OutlinedButton(
        onClick  = onClick,
        modifier = Modifier.fillMaxWidth().height(50.dp),
        border   = BorderStroke(1.dp, Color(0xFFDADCE0)),
        shape    = RoundedCornerShape(10.dp),
        colors   = ButtonDefaults.outlinedButtonColors(
            containerColor = Color.White,
            contentColor   = Color(0xFF3C4043),
        ),
    ) {
        // Google G icon (4 colored paths)
        androidx.compose.foundation.Canvas(modifier = Modifier.size(18.dp)) {
            val w = size.width; val h = size.height
            drawArc(color = Color(0xFF4285F4), startAngle = -90f, sweepAngle = 180f, useCenter = true)
            drawArc(color = Color(0xFF34A853), startAngle = 90f,  sweepAngle = 90f,  useCenter = true)
            drawArc(color = Color(0xFFFBBC05), startAngle = 180f, sweepAngle = 90f,  useCenter = true)
            drawArc(color = Color(0xFFEA4335), startAngle = 270f, sweepAngle = 90f,  useCenter = true)
        }
        Spacer(Modifier.width(8.dp))
        Text("Continuer avec Google", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Color(0xFF3C4043))
    }
}
