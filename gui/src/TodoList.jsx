import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TodoForm from './TodoForm';
import TodoItem from './TodoItem';
import './TodoList.css';

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [showLoginAlert, setShowLoginAlert] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

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

      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await axios.get('http://localhost:5500/api/todos', {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: dateStr },
      });
      setTodos(res.data || []);
    } catch (err) {
      console.error('Todos fetch error:', err);
      if (err.response?.status === 401 && showLoginAlert) {
        alert('Oturum süreniz doldu, lütfen giriş yapın!');
        setShowLoginAlert(false);
      }
    }
  };

  const addTodo = (todo) => setTodos(prev => [...prev, todo]);
  const deleteTodo = (id) => setTodos(prev => prev.filter(t => t._id !== id));
  const updateTodo = () => fetchTodos();

  return (
    <div className="todo-list">
      <h1 className="todo-list-title">My Todos</h1>

      <div className="todo-date-filter-container">
        <input
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="todo-date-filter"
        />
      </div>

      <TodoForm onAdd={addTodo} />

      <ul className="todo-list-items">
        {todos.map(todo => (
          <TodoItem
            key={todo._id}
            todo={todo}
            onDelete={deleteTodo}
            onUpdate={updateTodo}
          />
        ))}
      </ul>
    </div>
  );
};

export default TodoList;
