package fr.guesstoday.features.auth

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
import androidx.compose.ui.text.font.*
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
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
                onClick  = { /* TODO: navigate to forgot password */ },
                modifier = Modifier.align(Alignment.CenterHorizontally)
            ) { Text("Mot de passe oublié ?", color = AppColors.textDim, fontSize = 13.sp) }

            HorizontalDivider(color = AppColors.border)

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
                onClick   = { authViewModel.register(email.lowercase(), password, name.trim()) { navController.popBackStack(); navController.popBackStack() } }
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
