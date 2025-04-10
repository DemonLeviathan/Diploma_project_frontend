// src/components/User/UserDashboard.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext'; 
import {
Typography,
Container,
Box,
Button,
Paper,
Table,
TableBody,
TableCell,
TableContainer,
TableHead,
TableRow,
Alert,
Select,
MenuItem,
FormControl,
InputLabel,
Modal,
TextField,
} from '@mui/material';
import api from '../../services/api';
import ChallengeComponent from './ChallengeComponent'; 
import CallList from './CallList'; 
import UserActivityInput from './UserActivityInput'
import UserGoals from './UserGoals'

const UserDashboard = () => {
const { user } = useContext(AuthContext); 
const [users, setUsers] = useState([]);
const [friends, setFriends] = useState([]);
const [notifications, setNotifications] = useState([]);
const [userData, setUserData] = useState([]); 
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(10); 
const [totalPages, setTotalPages] = useState(0);
const [activityTypes, setActivityTypes] = useState([]); 
const [filteredActivities, setFilteredActivities] = useState([]); 
const [call, setCall] = useState(null); 
const [goals, setGoals] = useState([]);
const [newUserData, setNewUserData] = useState({
  activity_name: '',
  weight: '',
  height: '',
}); 
const [searchTerm, setSearchTerm] = useState('');
const [error, setError] = useState('');
const [success, setSuccess] = useState('');

const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false); 
const [selectedFriendForChallenge, setSelectedFriendForChallenge] = useState(null); 
const [selectedCallForChallenge, setSelectedCallForChallenge] = useState(''); 
const [calls, setCalls] = useState([]); 

const addGoal = (name) => {
  const newGoal = { id: Date.now(), name, description: "" };
  setGoals([...goals, newGoal]);
};

const addStep = (goalId, step) => {
  setGoals((prevGoals) =>
    prevGoals.map((goal) =>
      goal.id === goalId
        ? { ...goal, steps: [...(goal.steps || []), step] }
        : goal
    )
  );
};



useEffect(() => {
  const fetchNotifications = async () => {
    try {
      const userId = await getCurrentUserId();

      const [friendNotifications, challengeNotifications] = await Promise.all([
        api.get('/friendship/notifications', { params: { userId } }),
        api.get('/Challenge/notifications', { params: { userId } }),
      ]);

      console.log("friendNotifications",friendNotifications)
      console.log("challengeNotifications",challengeNotifications)

      const combinedNotifications = [
        ...friendNotifications.data.map((f) => ({ type: 'friendRequest', ...f })),
        ...challengeNotifications.data.map((c) => ({ type: 'challenge', ...c })),
      ];

      setNotifications(combinedNotifications);
    } catch (err) {
      console.error('Ошибка загрузки уведомлений:', err);
    }
  };

  fetchNotifications();
}, []);


useEffect(() => {
  if (user) {
    fetchFriends();
    fetchActivityTypes();
  } else {
    console.error('Текущий пользователь не определён.');
    setError('Текущий пользователь не определён.');
  }
}, [user]);

useEffect(() => {
  fetchUserData();
}, [currentPage]);

useEffect(() => {
  console.log("Обновленные данные пользователя:", userData);
}, [userData]);

useEffect(() => {
  fetchCallsNames();
}, []);

useEffect(() => {
  console.log("Загруженные вызовы:", calls);
}, [calls]);


const fetchUsers = useCallback(async () => {
  try {
    const currentUserId = localStorage.getItem('currentUser');
    const currentUserRole = localStorage.getItem('currentUserRole');

    if (!currentUserId || !currentUserRole) {
      setError('Текущий пользователь не определён.');
      return;
    }

    const response = await api.get('/user/users', { params: { searchTerm } });
    const filteredUsers = response.data.users.filter((user) => {
      console.log('Проверяем пользователя:', user);
      return user.username !== currentUserId && user.user_role !== 'Admin';
    });

    console.log('Отфильтрованный список пользователей:', filteredUsers);
    setUsers(filteredUsers);
  } catch (err) {
    console.error('Ошибка загрузки пользователей:', err);
    setError('Не удалось загрузить пользователей.');
  }
}, [searchTerm]);

const fetchFriends = useCallback(async () => {
  try {
    const username = localStorage.getItem('currentUser');
    if (!username) throw new Error('Имя пользователя отсутствует.');

    const userResponse = await api.get('/user/get-id', { params: { username } });
    const userId = userResponse.data.user_id;

    const response = await api.get('/friendship/list', { params: { userId } });
    setFriends(response.data || []);
  } catch (err) {
    console.error('Ошибка загрузки друзей:', err.response?.data || err.message);
    setError('У вас нет друзей.');
  }
}, []);

const fetchNotifications = async () => {
  try {
    const userId = await getCurrentUserId();
    console.log("ID пользователя для уведомлений:", userId);

    const [friendNotifications, challengeNotifications] = await Promise.all([
      api.get('/friendship/notifications', { params: { userId } }),
      api.get('/Сhallenge/notifications', { params: { userId } }),
    ]);

    console.log("Dataaa12",friendNotifications)

    const combinedNotifications = [
      ...friendNotifications.data.map((f) => ({ type: 'friendRequest', ...f })),
      ...challengeNotifications.data.map((c) => ({ type: 'challenge', ...c })),
    ];

    setNotifications(friendNotifications);
  } catch (err) {
    console.error('Ошибка загрузки уведомлений:', err.response?.data || err.message);
  }
};

const fetchUserData = useCallback(async () => {
  try {
    const username = localStorage.getItem("currentUser");
    const response = await api.get(`/userdata/all`, {
      params: { username: username, page: currentPage, size: pageSize },
    });
    const { records, totalPages } = response.data;

    setUserData(records);
    setTotalPages(totalPages);
  } catch (err) {
    console.error("Ошибка загрузки данных пользователя:", err);
    setError("Не удалось загрузить данные пользователя.");
  }
}, [currentPage, pageSize]);

const fetchActivityTypes = useCallback(async () => {
  try {
    const response = await api.get('/activity/types'); 
    setActivityTypes(response.data || []);
  } catch (err) {
    console.error('Ошибка загрузки типов активностей:', err);
    setError('Не удалось загрузить типы активностей.');
  }
}, []);

const fetchActivitiesByType = useCallback(async (type) => {
  try {
    if (!type) {
      setFilteredActivities([]); 
      return;
    }

    const response = await api.get('/activity/by-type', { params: { activityType: type } }); 
    setFilteredActivities(response.data || []);
  } catch (err) {
    console.error('Ошибка загрузки активностей по типу:', err);
    setError('Не удалось загрузить список активностей.');
  }
}, []);


const fetchCallsNames = async () => {
  try {
    const username = localStorage.getItem("currentUser");
    if (!username) throw new Error("Нет имени пользователя в localStorage.");

    const response = await api.get("/call/user-calls-name", { params: { username } });
    const callData = response.data.calls;

    //const callIdMap = await fetchCallIds();

    const callsWithId = callData.map((call) => ({
      ...call,
      //call_id: callIdMap[call.call_id] || null, 
    }));

    setCalls(callsWithId);

    setTotalPages(
      callsWithId.length > 0 ? Math.ceil(callsWithId.length / pageSize) : 1
    );
  } catch (error) {
    console.error("Ошибка при загрузке вызовов:", error);
    setError("Не удалось загрузить список вызовов.");
  }
};

const handleAddUserData = async () => {
  try {
    if (!newUserData.activity_name) {
      setError('Название активности обязательно.');
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      setError('Не удалось определить ID пользователя.');
      return;
    }

    await api.post('/userData', {
      ...newUserData,
      user_id: userId,
    });
    setSuccess('Данные успешно добавлены!');
    setTimeout(() => setSuccess(''), 3000);
    setNewUserData({ activity_name: '', weight: '', height: '' });
  } catch (err) {
    console.error('Ошибка добавления данных пользователя:', err);
    setError('Не удалось добавить данные пользователя.');
  }
};

const handleAddFriend = async (id) => {
  try {
    const username = localStorage.getItem('currentUser'); 
    if (!username) throw new Error('Имя пользователя отсутствует в localStorage.');

    const userResponse = await api.get('/user/get-id', { params: { username } });
    const userId = userResponse.data.user_id;

    const payload = {
      user1_id: userId,
      user2_id: id,
    };

    console.log('Payload для добавления в друзья:', payload);

    const response = await api.post('/friendship/add', payload);
    console.log('Ответ сервера:', response.data);

    setSuccess('Запрос отправлен!');
    setTimeout(() => setSuccess(''), 3000);
    fetchNotifications();
  } catch (err) {
    console.error('Ошибка добавления в друзья:', err.response?.data || err.message);
    setError('Не удалось отправить запрос.');
  }
};

const handleRespondNotification = async (
  notificationId,
  recieverName,
  recieverId,
  senderId,
  senderName,
  accept
) => {
  try {
    const username = localStorage.getItem('currentUser');
    if (!username) throw new Error('Имя пользователя отсутствует в localStorage.');

    const payload = {
      friend_id: notificationId,
      user1_id: senderId,
      user2_id: recieverId,
      IsPending: !accept,
    };

    console.log('Параметры для обработки уведомления:', {
      notificationId,
      recieverName,
      recieverId,
      senderId,
      senderName,
      accept,
    });
    console.log('Payload для отправки:', payload);

    const response = await api.post(`/friendship/respond`, payload, { params: { accept } });
    console.log('Ответ сервера:', response.data);

    setSuccess('Запрос обработан успешно!');

    setNotifications((prevNotifications) => {
      console.log('Предыдущие уведомления:', prevNotifications);
      const updatedNotifications = prevNotifications.filter(
        (notification) => notification.friend_id !== notificationId
      );
      console.log('Обновленные уведомления:', updatedNotifications);
      return updatedNotifications;
    });

    fetchFriends();
  } catch (err) {
    console.error('Ошибка обработки уведомления:', err.response?.data || err.message);
    setError('Не удалось обработать запрос.');
  }
};



const handleAcceptChallenge = async (challengeId) => {
  try {
    await api.post('/challenge/respond', { ChallengeId: challengeId, Accept: true });
    setNotifications((prev) =>
      prev.filter((notification) => notification.challengeId !== challengeId)
    );
  } catch (err) {
    console.error('Ошибка при принятии вызова:', err.response?.data || err.message);
    setError('Не удалось обработать запрос.');
  }
};

const handleRejectChallenge = async (challengeId) => {
  try {
    await api.post('/challenge/respond', { ChallengeId: challengeId, Accept: false });
    setNotifications((prev) =>
      prev.filter((notification) => notification.challengeId !== challengeId)
    );
  } catch (err) {
    console.error('Ошибка при отклонении вызова:', err.response?.data || err.message);
    setError('Не удалось обработать запрос.');
  }
};




const getCall = async (frequency) => {
  try {
    const username = localStorage.getItem('currentUser');
    console.log('Username из localStorage:', username);
    if (!username) throw new Error('Имя пользователя отсутствует в localStorage.');

    const response = await api.post(`/call/generate/${frequency}`, null, {
      params: { username },
    });
    console.log('Получен вызов:', response.data);

    setCall(response.data); 
  } catch (error) {
    console.error('Ошибка получения вызова:', error.response?.data || error.message);
    alert('Не удалось получить вызов.');
  }
};

const handleCallResponse = async (accept) => {
  try {
    if (!call) throw new Error('Нет вызова для обработки.');

    const newStatus = accept ? 'accepted' : 'rejected';
    const response = await api.post('/call/update-status', {
      callId: call.call_id,
      status: newStatus,
    });

    console.log(`Вызов ${accept ? 'принят' : 'отклонён'}`, response.data);

    alert(`Вызов ${accept ? 'принят' : 'отклонён'}`);
    setCall(null); 
  } catch (error) {
    console.error('Ошибка обработки вызова:', error.response?.data || error.message);
    alert('Не удалось обработать вызов.');
  }
};

const getCurrentUserId = useCallback(async () => {
  try {
    const username = localStorage.getItem('currentUser');
    if (!username) throw new Error('Имя пользователя отсутствует в localStorage.');

    const response = await api.get('/user/get-id', { params: { username } });
    return response.data.user_id;
  } catch (err) {
    console.error('Ошибка получения ID текущего пользователя:', err);
    setError('Не удалось определить текущего пользователя.');
    return null;
  }
}, []);


const handleLogout = async () => {
  try {
    await api.post('account/logout'); 
    localStorage.removeItem('currentUser'); 
    localStorage.removeItem('currentUserRole'); 
    localStorage.removeItem('token'); 
    window.location.href = '/login'; 
  } catch (err) {
    console.error('Ошибка выхода:', err.response?.data || err.message);
  }
};


if (!user) {
  return (
    <Typography variant="h6">
      Текущий пользователь не определён. Пожалуйста, войдите в систему.
    </Typography>
  );
}

return (
  <Container>
    <Typography variant="h4" gutterBottom>
      Hello, {localStorage.currentUser}!
    </Typography>

    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>} {}

    {/* Получение вызовов */}
    <Box sx={{ mb: 4 }}>
      {!call ? (
        <Box sx={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          {['daily', 'weekly', 'monthly'].map((type) => (
            <Paper
              key={type}
              sx={{
                width: 300,
                textAlign: 'center',
                padding: 2,
                boxShadow: 3,
                '&:hover': {
                  transform: 'scale(1.05)',
                  transition: 'transform 0.2s',
                },
              }}
            >
              <Typography variant="h6">
                {type === 'daily' && 'Ежедневный вызов'}
                {type === 'weekly' && 'Еженедельный вызов'}
                {type === 'monthly' && 'Ежемесячный вызов'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {type === 'daily' && 'Нажмите, чтобы получить ежедневное задание.'}
                {type === 'weekly' && 'Нажмите, чтобы получить вызов на неделю.'}
                {type === 'monthly' && 'Нажмите, чтобы получить вызов на месяц.'}
              </Typography>
              <Button variant="contained" onClick={() => getCall(type)} sx={{ mt: 2 }}>
                Получить вызов
              </Button>
            </Paper>
          ))}
        </Box>
      ) : (
        <Paper sx={{ maxWidth: 600, margin: '0 auto', padding: 2, boxShadow: 3 }}>
          <Typography variant="h6">{call.call_name}</Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            {call.description}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button variant="contained" onClick={() => handleCallResponse(true)} sx={{ m: 1 }}>
              Принять
            </Button>
            <Button variant="outlined" onClick={() => handleCallResponse(false)} sx={{ m: 1 }}>
              Заменить
            </Button>
          </Box>
        </Paper>
      )}
      <hr style={{ margin: '20px 0', borderColor: '#ddd' }} />
    </Box>

    {/* Список вызовов пользователя*/}
    <Box sx={{ p: 2, mb: 4 }}>
      <CallList /> {}
      <hr style={{ margin: '20px 0', borderColor: '#ddd' }} />
    </Box>

    <Box>
      <UserGoals/>
      <hr style={{ margin: '20px 0', borderColor: '#ddd' }} />
    </Box>


    {/* Добавление пользовательских данных */}
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6">Добавить данные пользователя</Typography>
      <Box>
      <UserActivityInput />
      </Box>
      {/* Выпадающий список типов активностей */}
      <TextField
          select
          label="Тип активности"
          value={newUserData.activity_type || ''}
          onChange={(e) => {
              const selectedType = e.target.value;
              setNewUserData({ ...newUserData, activity_type: selectedType });
              fetchActivitiesByType(selectedType); 
          }}
          fullWidth
          margin="normal"
          SelectProps={{
              native: true,
              displayEmpty: true,
          }}
          sx={{
            '& .MuiInputLabel-root': { display: newUserData.activity_type ? 'block' : 'none' },
        }}
      >
          <option value="">Выберите тип активности</option>
          {activityTypes.map((type) => (
              <option key={type} value={type}>
                  {type}
              </option>
          ))}
      </TextField>
      {/* Выпадающий список названий активностей */}
      <TextField
          select
          label="Название активности"
          value={newUserData.activity_name || ''}
          onChange={(e) => setNewUserData({ ...newUserData, activity_name: e.target.value })}
          fullWidth
          margin="normal"
          SelectProps={{
              native: true,
              displayEmpty: true,
          }}
          sx={{
            '& .MuiInputLabel-root': { display: newUserData.activity_type ? 'block' : 'none' },
        }}
      >
          <option value="">Выберите активность</option>
          {filteredActivities.map((activity) => (
              <option key={activity.activity_name} value={activity.activity_name}>
                  {activity.activity_name}
              </option>
          ))}
      </TextField>

      {/* Поля для ввода веса и роста */}
      <TextField
        label="Вес (кг)"
        value={newUserData.weight}
        onChange={(e) => setNewUserData({ ...newUserData, weight: e.target.value })}
        type="number"
        fullWidth
        margin="normal"
      />
      <TextField
        label="Рост (см)"
        value={newUserData.height}
        onChange={(e) => setNewUserData({ ...newUserData, height: e.target.value })}
        type="number"
        fullWidth
        margin="normal"
      />
      <Button variant="contained" onClick={handleAddUserData} sx={{ mt: 2 }}>
        Добавить
      </Button>
    </Box>

    {/* Список данных пользователя с пагинацией */}
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6">Ваши данные</Typography>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Дата</TableCell>
              <TableCell>Тип активности</TableCell>
              <TableCell>Название активности</TableCell>
              <TableCell>Вес (кг)</TableCell>
              <TableCell>Рост (см)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {userData.map((data) => (
              <TableRow key={data.data_id}>
                <TableCell>{new Date(data.date_info).toLocaleDateString()}</TableCell>
                <TableCell>{data.activityType || "Нет данных"}</TableCell>
                <TableCell>{data.activityName || "Нет данных"}</TableCell>
                <TableCell>{data.weight}</TableCell>
                <TableCell>{data.height}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Button
          variant="contained"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          sx={{ mr: 1 }}
        >
          Назад
        </Button>
        <Typography variant="body1" sx={{ alignSelf: 'center' }}>
          Страница {currentPage} из {totalPages}
        </Typography>
        <Button
          variant="contained"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          sx={{ ml: 1 }}
        >
          Вперёд
        </Button>
      </Box>
      <hr style={{ margin: '20px 0', borderColor: '#ddd' }} />
    </Box>

    {/* Функционал: поиск, друзья, уведомления */}
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6">Найти пользователя</Typography>
      <TextField
        label="Поиск пользователя"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button variant="contained" onClick={fetchUsers} sx={{ mt: 2 }}>
        Искать
      </Button>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Имя пользователя</TableCell>
              <TableCell>Действие</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    onClick={() => handleAddFriend(user.user_id)}
                  >
                    Добавить в друзья
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>

    {/* Список друзей */}
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6">Ваши друзья</Typography>
      {friends.length === 0 ? (
        <Typography variant="body1" sx={{ mt: 2 }}>
          Нет друзей
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Имя пользователя</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {friends.map((friend) => (
                <TableRow key={friend.friendId}>
                  <TableCell>{friend.friendName}</TableCell>
                  
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <hr style={{ margin: '40px 0', borderColor: '#ddd' }} />
    </Box>
    

    {/* Уведомления */}
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6">Уведомления</Typography>
      {notifications.length === 0 ? (
        <Typography variant="body1" sx={{ mt: 2 }}>
          Нет уведомлений
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Имя пользователя</TableCell>
                <TableCell>Тип уведомления</TableCell>
                <TableCell>Описание</TableCell>
                <TableCell align="right">Действие</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.map((notification, index) => (
                <TableRow key={index}>
                  <TableCell>{notification.senderName || 'Имя отсутствует'}</TableCell>
                  <TableCell>
                    {notification.type === 'friendRequest'
                      ? 'Запрос на дружбу'
                      : 'Вызов'}
                  </TableCell>
                  <TableCell>
                    {notification.type === 'challenge' && notification.description
                      ? notification.description
                      : 'Не указано'}
                  </TableCell>
                  <TableCell align="right">
                    {notification.type === 'friendRequest' ? (
                      <>
                        <Button
                          variant="contained"
                          onClick={() =>
                            handleRespondNotification(
                              notification.friend_id,
                              notification.recieverName,
                              notification.recieverId,
                              notification.senderId,
                              notification.senderName,
                              true
                            )
                          }
                          sx={{ mr: 1 }}
                        >
                          Принять
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() =>
                            handleRespondNotification(
                              notification.friend_id,
                              notification.recieverName,
                              notification.recieverId,
                              notification.senderId,
                              notification.senderName,
                              false
                            )
                          }
                        >
                          Отклонить
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="contained"
                          onClick={() => handleAcceptChallenge(notification.challengeId)}
                          sx={{ mr: 1 }}
                        >
                          Принять вызов
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => handleRejectChallenge(notification.challengeId)}
                        >
                          Отклонить вызов
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
<Button variant="contained" color="error" onClick={handleLogout}>
  Выйти
</Button>
</Box>

  </Container>
);
};

export default UserDashboard;
