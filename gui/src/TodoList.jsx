import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TodoForm from './TodoForm';
import TodoItem from './TodoItem';
import './TodoList.css';

const TodoList = () => {
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5500/api/todos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodos(res.data);
    } catch (err) {
      console.log('Not logged in or error:', err);
    }
  };

  const addTodo = (todo) => setTodos([...todos, todo]);
  const deleteTodo = (id) => setTodos(todos.filter(t => t._id !== id));

  return (
    <div className="todo-list">
      <h1 className="todo-list-title">My Todos</h1>
      <TodoForm onAdd={addTodo} />
      <ul className="todo-list-items">
        {todos.map(todo => (
          <TodoItem key={todo._id} todo={todo} onDelete={deleteTodo} />
        ))}
      </ul>
    </div>
  );
};

export default TodoList;