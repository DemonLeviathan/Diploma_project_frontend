import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Modal,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import api from '../../services/api';

const CallList = () => {
  const [calls, setCalls] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [selectedCallForChallenge, setSelectedCallForChallenge] = useState(null);
  const [selectedFriendForChallenge, setSelectedFriendForChallenge] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const callsPerPage = 4;

  const indexOfLastCall = currentPage * callsPerPage;
  const indexOfFirstCall = indexOfLastCall - callsPerPage;
  const currentCalls = calls.slice(indexOfFirstCall, indexOfLastCall);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const username = localStorage.getItem('currentUser');
        if (!username) throw new Error('Имя пользователя отсутствует.');

        const response = await api.get('/call/user-calls', { params: { username } });
        setCalls(response.data.calls || []);
      } catch (err) {
        console.error('Ошибка загрузки вызовов:', err);
      }
    };

    fetchCalls();

    const fetchFriends = async () => {
      try {
        const username = localStorage.getItem('currentUser');
        if (!username) throw new Error('Имя пользователя отсутствует.');

        const userResponse = await api.get('/user/get-id', { params: { username } });
        const userId = userResponse.data.user_id;

        const response = await api.get('/friendship/list', { params: { userId } });
        setFriends(response.data || []);
      } catch (err) {
        console.error('Ошибка загрузки друзей:', err);
      }
    };

    fetchFriends();
  }, []);

  
  const getCurrentUserId = async () => {
    try {
      const username = localStorage.getItem('currentUser');
      if (!username) throw new Error('Имя пользователя отсутствует в localStorage.');

      const response = await api.get('/user/get-id', { params: { username } });
      return response.data.user_id;
    } catch (err) {
      console.error('Ошибка получения ID текущего пользователя:', err);
      return null;
    }
  };

  const handleSendChallenge = async () => {
    try {
      if (!selectedFriendForChallenge?.friendId || !selectedCallForChallenge?.call_id) {
        setError('Друг или вызов не выбраны.');
        return;
      }
  
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) throw new Error('Не удалось определить ID пользователя.');
  
      const payload = {
        SenderId: currentUserId,
        ReceiverId: selectedFriendForChallenge.friendId,
        CallId: selectedCallForChallenge.call_id,
        CallName: selectedCallForChallenge.call_name, 
        Description: selectedCallForChallenge.description, 
      };
  
      console.log('Payload для отправки вызова:', payload);
  
      const response = await api.post('/challenge/send', payload);
      console.log('Вызов успешно отправлен:', response.data);
      setSuccess('Вызов успешно отправлен.');
      handleCloseChallengeModal();
    } catch (err) {
      console.error('Ошибка отправки вызова:', err.response?.data || err.message);
      setError(err.response?.data?.title || 'Не удалось отправить вызов.');
    }
  };
  
  const handleCloseChallengeModal = () => {
    setSelectedFriendForChallenge(null);
    setIsChallengeModalOpen(false);
    setError('');
    setSuccess('');
  };
  

  const updateCallStatus = async (callId, newStatus) => {
    try {
      await api.post('/call/update-status', {
        callId,
        status: newStatus,
      });

      setCalls((prevCalls) =>
        prevCalls.map((call) =>
          call.call_id === callId ? { ...call, status: newStatus } : call
        )
      );
    } catch (err) {
      console.error('Ошибка при обновлении статуса:', err.message || err);
      setError('Не удалось обновить статус вызова.');
    }
  };

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  return (
    <Box>
      {success && <Alert severity="success">{success}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer 
      component={Paper}
      sx={{
        mt: 2,
        mx: 'auto', 
        width: '90%', 
        maxWidth: '1200px', 
      }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentCalls.map((call) => (
              <TableRow key={call.call_id}>
                <TableCell>{call.call_name}</TableCell>
                <TableCell>{call.description}</TableCell>
                <TableCell>{call.call_date || 'Не указано'}</TableCell>
                <TableCell>{call.status}</TableCell>
                <TableCell align="center">
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Button
                      variant="contained"
                      onClick={() => updateCallStatus(call.call_id, 'completed')}
                    >
                      Выполнено
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => updateCallStatus(call.call_id, 'failed')}
                    >
                      Не выполнено
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => {
                        setSelectedCallForChallenge(call);
                        setIsChallengeModalOpen(true);
                      }}
                    >
                      Бросить вызов
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Pagination
          count={Math.ceil(calls.length / callsPerPage)}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>

      <Modal
  open={isChallengeModalOpen}
  onClose={() => setIsChallengeModalOpen(false)}
  aria-labelledby="send-challenge-modal"
  aria-describedby="send-challenge-modal-description"
>
  <Box
    sx={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 400,
      bgcolor: 'background.paper',
      boxShadow: 24,
      p: 4,
      borderRadius: 2,
    }}
  >
    <Typography id="send-challenge-modal" variant="h6" component="h2">
      Бросить вызов для вызова {selectedCallForChallenge?.call_name}
    </Typography>

    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1">Выберите друга:</Typography>
      <FormControl fullWidth sx={{ mt: 1 }}>
        <InputLabel id="select-friend-label">Друг</InputLabel>
        <Select
          labelId="select-friend-label"
          id="select-friend"
          value={selectedFriendForChallenge?.friendId || ''}
          onChange={(e) => {
            const selectedFriendId = e.target.value;
            const selectedFriend = friends.find(
              (friend) => friend.friendId === parseInt(selectedFriendId, 10)
            );
            console.log('Выбранный друг:', selectedFriend);
            setSelectedFriendForChallenge(selectedFriend || null);
          }}
        >
          <MenuItem value="">
            <em>Выберите друга</em>
          </MenuItem>
          {friends.map((friend) => (
            <MenuItem key={friend.friendId} value={friend.friendId}>
              {friend.friendName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>

    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
      <Button variant="outlined" onClick={() => setIsChallengeModalOpen(false)}>
        Отмена
      </Button>
      <Button
        variant="contained"
        onClick={() => {
          if (selectedFriendForChallenge && selectedCallForChallenge) {
            handleSendChallenge();
          } else {
            console.error('Не выбран друг или вызов.');
          }
        }}
      >
        Отправить
      </Button>
    </Box>
  </Box>
</Modal>

    </Box>
  );
};

export default CallList;
