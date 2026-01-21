/* ErrorGamePage - Página de Error Interactiva con Mini-Juego para ESAP */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Star, CheckCircle, XCircle, 
  Lightbulb, Brain, Award, Sparkles,
  RotateCcw, Home
} from 'lucide-react';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  category: 'esap' | 'colombia' | 'general';
  difficulty: 'easy' | 'medium' | 'hard';
}

const questions: Question[] = [
  {
    id: 1,
    question: "¿Qué significa ESAP?",
    options: [
      "Escuela Superior de Administración Pública",
      "Escuela Superior de Aprendizaje Público",
      "Entidad Superior de Administración Privada",
      "Escuela Secundaria de Administración Pública"
    ],
    correctAnswer: 0,
    category: 'esap',
    difficulty: 'easy'
  },
  {
    id: 2,
    question: "¿En qué año fue fundada la ESAP?",
    options: ["1948", "1958", "1968", "1978"],
    correctAnswer: 1,
    category: 'esap',
    difficulty: 'medium'
  },
  {
    id: 3,
    question: "¿Cuál es la capital de Colombia?",
    options: ["Medellín", "Cali", "Bogotá", "Cartagena"],
    correctAnswer: 2,
    category: 'colombia',
    difficulty: 'easy'
  },
  {
    id: 4,
    question: "La ESAP es una entidad de:",
    options: [
      "Carácter privado",
      "Carácter universitario público",
      "Carácter internacional",
      "Carácter territorial"
    ],
    correctAnswer: 1,
    category: 'esap',
    difficulty: 'medium'
  },
  {
    id: 5,
    question: "¿Cuántos departamentos tiene Colombia?",
    options: ["30", "32", "34", "36"],
    correctAnswer: 1,
    category: 'colombia',
    difficulty: 'medium'
  },
  {
    id: 6,
    question: "¿Qué ofrece principalmente la ESAP?",
    options: [
      "Formación en artes",
      "Formación en administración pública",
      "Formación en medicina",
      "Formación en ingeniería"
    ],
    correctAnswer: 1,
    category: 'esap',
    difficulty: 'easy'
  },
  {
    id: 7,
    question: "¿Cuál es el océano que baña las costas colombianas?",
    options: ["Atlántico", "Índico", "Pacífico", "Atlántico y Pacífico"],
    correctAnswer: 3,
    category: 'colombia',
    difficulty: 'medium'
  },
  {
    id: 8,
    question: "La ESAP tiene presencia en:",
    options: [
      "Solo en Bogotá",
      "Todo el territorio nacional",
      "Solo en las principales ciudades",
      "Solo en la región andina"
    ],
    correctAnswer: 1,
    category: 'esap',
    difficulty: 'easy'
  },
  {
    id: 9,
    question: "¿Quién fue el libertador de Colombia?",
    options: [
      "José de San Martín",
      "Simón Bolívar",
      "Antonio Nariño",
      "Francisco de Paula Santander"
    ],
    correctAnswer: 1,
    category: 'colombia',
    difficulty: 'easy'
  },
  {
    id: 10,
    question: "¿Cuál es la misión principal de la ESAP?",
    options: [
      "Formar empresarios",
      "Capacitar funcionarios públicos",
      "Formar artistas",
      "Capacitar deportistas"
    ],
    correctAnswer: 1,
    category: 'esap',
    difficulty: 'medium'
  }
];

interface ErrorGamePageProps {
  onRetry?: () => void;
  onGoHome?: () => void;
}

export function ErrorGamePage({ onRetry, onGoHome }: ErrorGamePageProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [characterMood, setCharacterMood] = useState<'idle' | 'happy' | 'thinking' | 'celebrating'>('idle');
  const [streak, setStreak] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState(0);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  useEffect(() => {
    // Animación idle del personaje
    const interval = setInterval(() => {
      if (characterMood === 'idle') {
        setCharacterMood('thinking');
        setTimeout(() => setCharacterMood('idle'), 2000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [characterMood]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answerIndex);
    const correct = answerIndex === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    setAnsweredQuestions(prev => prev + 1);

    if (correct) {
      const points = currentQuestion.difficulty === 'easy' ? 10 : 
                     currentQuestion.difficulty === 'medium' ? 20 : 30;
      setScore(prev => prev + points + (streak * 5)); // Bonus por racha
      setStreak(prev => prev + 1);
      setCharacterMood('happy');
    } else {
      setStreak(0);
      setCharacterMood('idle');
    }

    // Avanzar a la siguiente pregunta o finalizar
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setCharacterMood('idle');
      } else {
        setGameFinished(true);
        setCharacterMood('celebrating');
      }
    }, 2000);
  };

  const resetGame = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setGameFinished(false);
    setCharacterMood('idle');
    setStreak(0);
    setAnsweredQuestions(0);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'esap': return 'bg-blue-500';
      case 'colombia': return 'bg-green-500';
      case 'general': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'esap': return 'ESAP';
      case 'colombia': return 'Colombia';
      case 'general': return 'General';
      default: return 'Pregunta';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header con mensaje de error */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 3
            }}
            className="inline-block mb-4"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center mx-auto shadow-xl">
              <span className="text-white text-4xl">😅</span>
            </div>
          </motion.div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            ¡Ups! Algo salió mal
          </h1>
          <p className="text-gray-600 text-lg">
            Mientras trabajamos en solucionarlo, ¿qué tal un pequeño quiz?
          </p>
        </motion.div>

        {/* Juego Principal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          style={{ border: '3px solid #1e5da8' }}
        >
          {/* Barra de progreso y puntuación */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-300" />
                <div>
                  <div className="text-white text-sm font-medium">Puntuación</div>
                  <motion.div 
                    className="text-white text-2xl font-bold"
                    key={score}
                    animate={{ scale: [1, 1.2, 1] }}
                  >
                    {score}
                  </motion.div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-white/80 text-sm">Progreso</div>
                <div className="text-white text-lg font-semibold">
                  {answeredQuestions} / {totalQuestions}
                </div>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="w-full bg-blue-900/30 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-400 to-green-500"
                initial={{ width: 0 }}
                animate={{ width: `${(answeredQuestions / totalQuestions) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Racha */}
            <AnimatePresence>
              {streak > 0 && (
                <motion.div
                  initial={{ scale: 0, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, y: -20 }}
                  className="mt-3 flex items-center gap-2 justify-center"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span className="text-yellow-300 font-bold">
                    ¡Racha de {streak}! +{streak * 5} puntos bonus
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!gameFinished ? (
            <div className="p-8">
              {/* Personaje Animado */}
              <motion.div
                className="flex justify-center mb-8"
                animate={
                  characterMood === 'happy' 
                    ? { y: [0, -20, 0], rotate: [0, 360] }
                    : characterMood === 'thinking'
                    ? { x: [-5, 5, -5, 0] }
                    : {}
                }
                transition={{ duration: 0.6 }}
              >
                <div className="relative">
                  <motion.div
                    className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-xl"
                    animate={{
                      boxShadow: characterMood === 'happy' 
                        ? ['0 10px 40px rgba(59, 130, 246, 0.5)', '0 10px 60px rgba(34, 197, 94, 0.7)', '0 10px 40px rgba(59, 130, 246, 0.5)']
                        : '0 10px 40px rgba(59, 130, 246, 0.5)'
                    }}
                    transition={{ duration: 1, repeat: characterMood === 'happy' ? 3 : 0 }}
                  >
                    <span className="text-6xl">
                      {characterMood === 'happy' ? '🎉' : 
                       characterMood === 'thinking' ? '🤔' : '👨‍🎓'}
                    </span>
                  </motion.div>
                  
                  {/* Estrellas cuando acierta */}
                  <AnimatePresence>
                    {characterMood === 'happy' && (
                      <>
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, x: 0, y: 0 }}
                            animate={{ 
                              scale: [0, 1, 0],
                              x: Math.cos(i * 60 * Math.PI / 180) * 80,
                              y: Math.sin(i * 60 * Math.PI / 180) * 80
                            }}
                            exit={{ scale: 0 }}
                            transition={{ duration: 0.6, delay: i * 0.1 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                          >
                            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                          </motion.div>
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Categoría */}
              <div className="flex justify-center mb-6">
                <span className={`${getCategoryColor(currentQuestion.category)} text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-2`}>
                  <Brain className="w-4 h-4" />
                  {getCategoryLabel(currentQuestion.category)}
                </span>
              </div>

              {/* Pregunta */}
              <motion.div
                key={currentQuestion.id}
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8 text-center leading-tight">
                  {currentQuestion.question}
                </h2>

                {/* Opciones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrectAnswer = index === currentQuestion.correctAnswer;
                    const showCorrect = selectedAnswer !== null && isCorrectAnswer;
                    const showIncorrect = selectedAnswer !== null && isSelected && !isCorrect;

                    return (
                      <motion.button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        disabled={selectedAnswer !== null}
                        className={`p-4 rounded-xl text-left transition-all duration-300 font-medium relative overflow-hidden ${
                          showCorrect
                            ? 'bg-green-100 border-2 border-green-500 text-green-800'
                            : showIncorrect
                            ? 'bg-red-100 border-2 border-red-500 text-red-800'
                            : isSelected
                            ? 'bg-blue-100 border-2 border-blue-500 text-blue-800'
                            : 'bg-gray-50 border-2 border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300'
                        }`}
                        whileHover={selectedAnswer === null ? { scale: 1.02, y: -2 } : {}}
                        whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
                        animate={
                          showCorrect || showIncorrect
                            ? { scale: [1, 1.05, 1] }
                            : {}
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            showCorrect
                              ? 'bg-green-500'
                              : showIncorrect
                              ? 'bg-red-500'
                              : 'bg-blue-600'
                          }`}>
                            {showCorrect ? (
                              <CheckCircle className="w-5 h-5 text-white" />
                            ) : showIncorrect ? (
                              <XCircle className="w-5 h-5 text-white" />
                            ) : (
                              <span className="text-white font-bold text-sm">
                                {String.fromCharCode(65 + index)}
                              </span>
                            )}
                          </div>
                          <span className="flex-1">{option}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Feedback */}
                <AnimatePresence>
                  {selectedAnswer !== null && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${
                        isCorrect
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                          <div>
                            <p className="text-green-800 font-semibold">¡Excelente!</p>
                            <p className="text-green-700 text-sm">
                              +{currentQuestion.difficulty === 'easy' ? 10 : 
                                currentQuestion.difficulty === 'medium' ? 20 : 30} puntos
                              {streak > 0 && ` + ${streak * 5} bonus por racha`}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                          <div>
                            <p className="text-red-800 font-semibold">No es correcta</p>
                            <p className="text-red-700 text-sm">
                              La respuesta correcta es: {currentQuestion.options[currentQuestion.correctAnswer]}
                            </p>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          ) : (
            /* Pantalla final */
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="p-8 text-center"
            >
              {/* Personaje celebrando */}
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 10, 0],
                  y: [0, -20, 0]
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
                className="inline-block mb-6"
              >
                <div className="w-40 h-40 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                  <span className="text-8xl">🎊</span>
                </div>
              </motion.div>

              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                ¡Juego completado!
              </h2>

              <motion.div
                className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-4 rounded-2xl mb-6"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Award className="w-8 h-8" />
                <div>
                  <div className="text-sm opacity-90">Puntuación Final</div>
                  <div className="text-3xl font-bold">{score} puntos</div>
                </div>
              </motion.div>

              <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-2xl mb-6 border-2 border-green-200">
                <Lightbulb className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-xl font-semibold text-gray-800 mb-2">
                  ¡Gracias por esperar!
                </p>
                <p className="text-gray-600">
                  Ya estamos trabajando para solucionar el problema.
                  <br />
                  Nuestro equipo técnico está en ello.
                </p>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <div className="text-blue-600 text-2xl font-bold">
                    {questions.filter((_, i) => i < answeredQuestions && i === currentQuestionIndex ? isCorrect : true).length}
                  </div>
                  <div className="text-gray-600 text-sm">Correctas</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <div className="text-green-600 text-2xl font-bold">
                    {Math.max(...[streak, 0])}
                  </div>
                  <div className="text-gray-600 text-sm">Mejor racha</div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  onClick={resetGame}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RotateCcw className="w-5 h-5" />
                  Jugar de nuevo
                </motion.button>

                {onRetry && (
                  <motion.button
                    onClick={onRetry}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RotateCcw className="w-5 h-5" />
                    Reintentar
                  </motion.button>
                )}

                {onGoHome && (
                  <motion.button
                    onClick={onGoHome}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Home className="w-5 h-5" />
                    Ir al inicio
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-8 text-gray-600"
        >
          <p className="text-sm">
            © {new Date().getFullYear()} ESAP - Escuela Superior de Administración Pública
          </p>
          <p className="text-xs mt-1">
            Formando servidores públicos de excelencia desde 1958
          </p>
        </motion.div>
      </div>
    </div>
  );
}
