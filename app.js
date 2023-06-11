const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

app.use(express.static('public'));

mongoose.connect('mongodb+srv://admin:admin@cluster0.wotqzfg.mongodb.net/sport', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Подключено к базе данных MongoDB');
}).catch((err) => {
  console.log('Ошибка подключения к базе данных MongoDB:', err);
});
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: true,
  saveUninitialized: true
}));

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
  firstName: String,
  lastName: String,
  className: String,
  role: { type: String, default: 'user' }
});

const User = mongoose.model('User', UserSchema);

const TestResultSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    result: { type: Number, required: true },
    date: { type: Date, default: Date.now }
  });
  
  const TestResult = mongoose.model('TestResult', TestResultSchema);

app.get('/', async (req, res) => {
    if (req.session.userId) {
      return res.redirect('/dashboard'); // Если пользователь уже авторизован, перенаправляем на страницу dashboard
    }
  
    try {
      const users = await User.find();
      res.render('index', { errors: null, successMessage: null, users });
    } catch (error) {
      console.log(error);
      res.render('index', { errors: ['Произошла ошибка при получении данных из базы данных'], successMessage: null });
    }
  });
  
  

  app.post('/register', [
    check('registerUsername').notEmpty().withMessage('Введите логин'),
    check('registerEmail').isEmail().withMessage('Введите действительный адрес электронной почты'),
    check('registerFirstName').notEmpty().withMessage('Введите имя'),
    check('registerLastName').notEmpty().withMessage('Введите фамилию'),
    check('registerClass').notEmpty().withMessage('Введите класс'),
    check('registerPassword').isLength({ min: 6 }).withMessage('Пароль должен содержать не менее 6 символов'),
    check('registerConfirmPassword').custom((value, { req }) => {
      if (value !== req.body.registerPassword) {
        throw new Error('Пароли не совпадают');
      }
      return true;
    })
  ], async (req, res) => {
    const errors = validationResult(req);
  
    if (!errors.isEmpty()) {
      console.log('Ошибки:', errors.array()); // Вывод ошибок в консоль
  
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { registerUsername, registerEmail, registerPassword, registerFirstName, registerLastName, registerClass } = req.body;
  
    try {
      const existingUser = await User.findOne({ email: registerEmail });
      if (existingUser) {
        return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
      }
  
      const hashedPassword = await bcrypt.hash(registerPassword, 10);
  
      const newUser = new User({
        username: registerUsername,
        email: registerEmail,
        password: hashedPassword,
        firstName: registerFirstName,
        lastName: registerLastName,
        className: registerClass
      });
  
      await newUser.save();
  
      req.session.userId = newUser._id;
      console.log('Регистрация прошла успешно');
      return res.json({ success: true });
    } catch (error) {
      console.log('Ошибка:', error); // Вывод ошибки в консоль
      return res.status(500).json({ error: 'Произошла ошибка. Пожалуйста, попробуйте еще раз.' });
    }
  });
  
  
  app.post('/login', async (req, res) => {
    const { loginUsername, loginPassword } = req.body;
  
    console.log('Отправляемые данные:', { loginUsername, loginPassword });
  
    try {
      const user = await User.findOne({ username: loginUsername });
      if (!user) {
        console.log('Полученные данные:', { success: false });
        return res.json({ success: false });
      }
  
      const passwordMatch = await bcrypt.compare(loginPassword, user.password);
      if (!passwordMatch) {
        console.log('Полученные данные:', { success: false });
        return res.json({ success: false });
      }
  
      req.session.userId = user._id;
      console.log('Авторизация прошла успешно');
      res.json({ success: true }); // Отправляем успешный ответ
    } catch (error) {
      console.log(error);
      res.json({ success: false });
    }
  });
  
  

app.get('/dashboard', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.redirect('/');
    }

    res.render('dashboard', { user });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

app.get('/security', async (req, res) => {
    if (!req.session.userId) {
      return res.redirect('/');
    }
  
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.redirect('/');
      }
  
      res.render('security', { user });
    } catch (error) {
      console.log(error);
      res.redirect('/');
    }
  });

  app.get('/test', async (req, res) => {
    if (!req.session.userId) {
      return res.redirect('/');
    }
  
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.redirect('/');
      }
  
      const testResult = await TestResult.findOne({ userId: user._id }).sort({ date: -1 }); // Находим самый последний результат теста
  
      if (testResult) {
        console.log('Последний результат теста:', testResult.result); // Выводим последний результат теста в консоль
      }
  
      res.render('test', { testResult, user }); // Передаем переменные testResult и user в шаблон
    } catch (error) {
      console.log(error);
      res.redirect('/');
    }
  });
  
  
  
  
  
  

  app.post('/test', async (req, res) => {
    const { q1, q2, q3, q4, q5, q6, q7 } = req.body;
  
    try {
      console.log('Полученные ответы:', { q1, q2, q3, q4, q5, q6, q7 }); // Выводим полученные ответы в консоль
  
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.redirect('/');
      }
  
      const answers = [q1, q2, q3, q4, q5, q6, q7];
      const totalQuestions = 7; // Общее количество вопросов

      const questions = [
        { correct: 'b' },
        { correct: 'd' },
        { correct: 'a' },
        { correct: 'c' },
        { correct: 'b' },
        { correct: 'd' },
        { correct: 'a' }
      ];
      
      

      const correctAnswers = answers.filter((answer, index) => answer === questions[index].correct).length;
      const percentage = (correctAnswers / totalQuestions) * 100; // Рассчитываем процент правильных ответов
  
      const testResult = new TestResult({
        userId: user._id,
        result: percentage,
        date: new Date()
      });
  
      await testResult.save();
  
      console.log('Результат теста сохранен:', testResult); // Выводим результат в консоль
  
      res.redirect('/test');
    } catch (error) {
      console.log(error);
      res.redirect('/');
    }
  });
  
  app.get('/res', async (req, res) => {
    if (!req.session.userId) {
      return res.redirect('/');
    }
  
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.redirect('/');
      }
  
      const testResults = await TestResult.find({ userId: user._id }).sort({ date: -1 }); // Находим все результаты тестирования пользователя
  
      res.render('res', { testResults, user }); // Рендерим шаблон res.ejs и передаем переменные testResults и user
    } catch (error) {
      console.log(error);
      res.redirect('/');
    }
  });
  
  app.get('/set', (req, res) => {
    res.render('set');
  });
  
app.get('/adm', async (req, res) => {
    
  try {
    
    if (!req.session.userId) {
      throw new Error('Пользователь не найден');
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    const testResults = await TestResult.find({}).populate('userId').sort({ date: -1 });

    res.render('adm', { testResults, user });
  } catch (error) {
    console.log(error);
    res.render('error'); // Отображение страницы ошибки
  }
});

  
  
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
