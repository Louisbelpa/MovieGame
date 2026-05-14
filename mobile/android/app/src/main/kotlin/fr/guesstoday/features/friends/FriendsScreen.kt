package fr.guesstoday.features.friends

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.*
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import dagger.hilt.android.lifecycle.HiltViewModel
import fr.guesstoday.data.api.*
import fr.guesstoday.features.profile.UserAvatar
import fr.guesstoday.ui.theme.AppColors
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class FriendsUiState(
    val payload: FriendsPayload? = null,
    val isLoading: Boolean       = false,
    val error: String?           = null,
    val addCode: String          = "",
    val isAdding: Boolean        = false,
    val addError: String?        = null,
    val addSuccess: Boolean      = false,
)

@HiltViewModel
class FriendsViewModel @Inject constructor(private val api: ApiService) : ViewModel() {
    private val _state = MutableStateFlow(FriendsUiState())
    val state = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.FRANCE).format(Date())
            runCatching { api.friends(today) }
                .onSuccess { p -> _state.update { it.copy(payload = p, isLoading = false) } }
                .onFailure { e -> _state.update { it.copy(isLoading = false, error = e.message) } }
        }
    }

    fun onCodeChange(v: String) { _state.update { it.copy(addCode = v, addError = null, addSuccess = false) } }

    fun addFriend() {
        viewModelScope.launch {
            _state.update { it.copy(isAdding = true, addError = null) }
            runCatching { api.addFriend(FriendCodeBody(_state.value.addCode.uppercase())) }
                .onSuccess { _state.update { it.copy(isAdding = false, addCode = "", addSuccess = true) }; load() }
                .onFailure { e -> _state.update { it.copy(isAdding = false, addError = e.message) } }
        }
    }

    fun accept(userId: Int) {
        viewModelScope.launch {
            runCatching { api.acceptFriend(FriendUserIdBody(userId)) }.onSuccess { load() }
        }
    }

    fun remove(userId: Int) {
        viewModelScope.launch {
            runCatching { api.removeFriend(userId) }.onSuccess { load() }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsScreen(
    navController: NavController,
    vm: FriendsViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsState()

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            TopAppBar(
                title = { Text("Amis", color = AppColors.text) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = null, tint = AppColors.text)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.background),
            )
        }
    ) { padding ->
        when {
            state.isLoading && state.payload == null -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = AppColors.gold)
                }
            }
            state.payload != null -> {
                LazyColumn(
                    modifier            = Modifier.fillMaxSize().padding(padding),
                    contentPadding      = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    item { YourCodeCard(state.payload!!.yourCode) }
                    item { AddFriendCard(state, vm) }

                    val pending = state.payload!!.friends.filter { it.isPending }
                    if (pending.isNotEmpty()) {
                        item { SectionTitle("Demandes reçues") }
                        items(pending) { FriendRow(it, vm) }
                    }

                    val friends = state.payload!!.friends.filter { it.isFriend }
                    if (friends.isNotEmpty()) {
                        item { SectionTitle("Amis — aujourd'hui") }
                        items(friends, key = { it.userId }) { FriendRow(it, vm) }
                    } else if (pending.isEmpty()) {
                        item {
                            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.PeopleAlt, contentDescription = null, tint = AppColors.muted, modifier = Modifier.size(48.dp))
                                Spacer(Modifier.height(8.dp))
                                Text("Pas encore d'amis", color = AppColors.textDim, fontSize = 14.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun YourCodeCard(code: String) {
    val clipboard = LocalClipboardManager.current
    var copied by remember { mutableStateOf(false) }
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape    = RoundedCornerShape(10.dp),
        color    = AppColors.surface,
        border   = BorderStroke(1.dp, AppColors.border)
    ) {
        Column(Modifier.padding(16.dp).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("MON CODE AMI", color = AppColors.textDim, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Spacer(Modifier.height(8.dp))
            Text(code, color = AppColors.gold, fontSize = 26.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, letterSpacing = 4.sp)
            Spacer(Modifier.height(8.dp))
            TextButton(onClick = {
                clipboard.setText(AnnotatedString(code))
                copied = true
            }) {
                Icon(if (copied) Icons.Default.Check else Icons.Default.ContentCopy, contentDescription = null,
                    tint = if (copied) AppColors.green else AppColors.textDim, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text(if (copied) "Copié !" else "Copier", color = if (copied) AppColors.green else AppColors.textDim, fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun AddFriendCard(state: FriendsUiState, vm: FriendsViewModel) {
    Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), color = AppColors.surface, border = BorderStroke(1.dp, AppColors.border)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("AJOUTER UN AMI", color = AppColors.textDim, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value         = state.addCode,
                    onValueChange = { vm.onCodeChange(it) },
                    placeholder   = { Text("Code ami", color = AppColors.muted) },
                    modifier      = Modifier.weight(1f),
                    singleLine    = true,
                    colors        = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AppColors.gold.copy(alpha = 0.5f),
                        unfocusedBorderColor = AppColors.border,
                        focusedTextColor = AppColors.text,
                        unfocusedTextColor = AppColors.text,
                        containerColor = AppColors.surfaceAlt,
                        cursorColor = AppColors.gold,
                    )
                )
                Button(
                    onClick  = { vm.addFriend() },
                    enabled  = state.addCode.isNotBlank() && !state.isAdding,
                    colors   = ButtonDefaults.buttonColors(containerColor = AppColors.gold, contentColor = AppColors.background),
                    shape    = RoundedCornerShape(10.dp),
                ) {
                    if (state.isAdding) CircularProgressIndicator(Modifier.size(18.dp), color = AppColors.background, strokeWidth = 2.dp)
                    else Text("Ajouter", fontWeight = FontWeight.SemiBold)
                }
            }
            state.addError?.let { Text(it, color = AppColors.red, fontSize = 12.sp) }
            if (state.addSuccess) Text("Demande envoyée !", color = AppColors.green, fontSize = 12.sp)
        }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(title.uppercase(), color = AppColors.textDim, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
}

@Composable
private fun FriendRow(friend: FriendEntry, vm: FriendsViewModel) {
    Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), color = AppColors.surface, border = BorderStroke(1.dp, AppColors.border)) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            UserAvatar(friend.avatarUrl, 40.dp)
            Column(Modifier.weight(1f)) {
                Text(friend.displayName, color = AppColors.text, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                if (friend.isPending) Text("Souhaite vous ajouter", color = AppColors.textDim, fontSize = 12.sp)
            }
            when {
                friend.isPending -> {
                    Button(
                        onClick = { vm.accept(friend.userId) },
                        colors  = ButtonDefaults.buttonColors(containerColor = AppColors.gold, contentColor = AppColors.background),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        shape   = RoundedCornerShape(6.dp),
                    ) { Text("Accepter", fontSize = 13.sp, fontWeight = FontWeight.Medium) }
                }
                friend.isFriend && friend.result != null -> {
                    val won = friend.result == "won"
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (won) Icons.Default.CheckCircle else Icons.Default.Cancel,
                            contentDescription = null, tint = if (won) AppColors.green else AppColors.red, modifier = Modifier.size(18.dp))
                        if (won && friend.attemptsUsed != null) {
                            Spacer(Modifier.width(4.dp))
                            Text("${friend.attemptsUsed}", color = AppColors.textDim, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}
