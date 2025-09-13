import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TodoForm from './TodoForm';
import TodoItem from './TodoItem';
import './TodoList.css';

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [showLoginAlert, setShowLoginAlert] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchTodos();
  }, [selectedDate]);

  const fetchTodos = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        if (showLoginAlert) {
          alert('Token yok, lütfen giriş yapın!');
          setShowLoginAlert(false);
        }
        return;
      }
      const params = selectedDate ? { date: selectedDate.toISOString() } : {};
      const res = await axios.get('http://localhost:5500/api/todos', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setTodos(res.data);
    } catch (err) {
      console.log('Todos error:', err.message);
      if (err.response?.status === 401 && showLoginAlert) {
        alert('Oturum süreniz doldu, lütfen giriş yapın!');
        setShowLoginAlert(false);
      }
    }
  };

  const addTodo = (todo) => setTodos([...todos, todo]);
  const deleteTodo = (id) => setTodos(todos.filter(t => t._id !== id));
  const updateTodo = () => fetchTodos();

  return (
    <div className="todo-list">
      <h1 className="todo-list-title">My Todos</h1>
      <div className="todo-date-filter-container">
        <input
          type="date"
          onChange={(e) => {
            const date = e.target.value ? new Date(e.target.value) : null;
            setSelectedDate(date);
          }}
          className="todo-date-filter"
        />
      </div>
      <TodoForm onAdd={addTodo} />
      <ul className="todo-list-items">
        {todos.map(todo => (
          <TodoItem key={todo._id} todo={todo} onDelete={deleteTodo} onUpdate={updateTodo} />
        ))}
      </ul>
    </div>
  );
};

export default TodoList;