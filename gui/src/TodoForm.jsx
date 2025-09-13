import React, { useState } from 'react';
import axios from 'axios';
import './TodoForm.css';

const TodoForm = ({ onAdd }) => {
  const [text, setText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5500/api/todos', { text }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onAdd(res.data);
      setText('');
    } catch (err) {
      alert('Error adding todo: ' + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="todo-form">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add new todo..."
        className="todo-form-input"
      />
      <button type="submit" className="todo-form-button">Add</button>
    </form>
  );
};

export default TodoForm;