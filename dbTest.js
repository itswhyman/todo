import mongoose from 'mongoose';

// MongoDB bağlantısı
await mongoose.connect('mongodb://127.0.0.1:27017/todoapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

console.log('MongoDB connected!');

// User şeması
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
});

const User = mongoose.model('User', userSchema);

// Todo şeması
const todoSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  completed: Boolean,
  date: Date,
});

const Todo = mongoose.model('Todo', todoSchema);

async function runTest() {
  // Yeni kullanıcı oluştur
  const user = new User({
    username: 'testuser',
    email: 'testuser@example.com',
    password: '123456',
  });

  await user.save();
  console.log('Yeni kullanıcı eklendi:', user);

  // Kullanıcının todo’sunu oluştur
  const todo = new Todo({
    userId: user._id,
    title: 'İlk todo',
    completed: false,
    date: new Date(),
  });

  await todo.save();
  console.log('Yeni todo eklendi:', todo);

  // DB’deki tüm kullanıcıları ve todo’ları listele
  const users = await User.find();
  const todos = await Todo.find();

  console.log('\n--- Tüm Kullanıcılar ---');
  console.log(users);

  console.log('\n--- Tüm Todos ---');
  console.log(todos);

  // Bağlantıyı kapat
  mongoose.connection.close();
}

runTest();
