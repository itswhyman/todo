import React from 'react';
import axios from 'axios';
import './TodoItem.css';

const TodoItem = ({ todo, onDelete }) => {
  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5500/api/todos/${todo._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onDelete(todo._id);
    } catch (err) {
      alert('Error deleting todo');
    }
  };

  return (
    <li className={`todo-item ${todo.completed ? 'todo-item-completed' : ''}`}>
      <span>{todo.text}</span>
      <button onClick={handleDelete} className="todo-item-delete">Delete</button>
    </li>
  );
};

export default TodoItem;