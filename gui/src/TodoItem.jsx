import React from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import './TodoItem.css';

const TodoItem = ({ todo, onDelete, onUpdate }) => {
  const handleToggle = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5500/api/todos/${todo._id}`, { completed: !todo.completed }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdate(); // Fetch todos after update
    } catch (err) {
      alert('Error updating todo: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Emin misiniz? Todo silinecek.')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5500/api/todos/${todo._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onDelete(todo._id);
      } catch (err) {
        alert('Error deleting todo: ' + err.message);
      }
    }
  };

  return (
    <li className={`todo-item ${todo.completed ? 'todo-item-completed' : ''}`}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={handleToggle}
        className="todo-item-checkbox"
      />
      <span className="todo-item-text">{todo.text}</span>
      <button onClick={handleDelete} className="todo-item-delete">
        <FontAwesomeIcon icon={faTrash} />
      </button>
    </li>
  );
};

export default TodoItem;