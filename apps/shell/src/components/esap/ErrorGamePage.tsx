/* ErrorGamePage - Página de Error Interactiva con Mini-Juego y Ranking para ESAP */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ESAPLogo } from '../../assets/ESAPLogo';
import { 
  Trophy, Star, CheckCircle, XCircle, 
  Lightbulb, Brain, Award, Sparkles,
  RotateCcw, Home, Copy, Check,
  MessageSquare, AlertTriangle, Clock, Zap, ListOrdered
} from 'lucide-react';
import { apiClient } from '../../services/api/apiClient';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  category: 'esap' | 'colombia' | 'general';
  difficulty: 'easy' | 'medium' | 'hard';
}

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  date: string;
}

const questionsPool: Question[] = [
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
  },
  {
    id: 11,
    question: "¿Cuál de las siguientes opciones describe el régimen laboral principal de los servidores públicos en la ESAP?",
    options: [
      "Trabajadores oficiales",
      "Empleados públicos de carrera o libre nombramiento y remoción",
      "Contratistas de prestación de servicios",
      "Auxiliares de la administración"
    ],
    correctAnswer: 1,
    category: 'esap',
    difficulty: 'medium'
  },
  {
    id: 12,
    question: "¿Qué es la \"Conciliación Prejudicial\" en un proceso laboral en Colombia?",
    options: [
      "Un acuerdo voluntario antes de iniciar una demanda formal",
      "Una sentencia ejecutoriada por un juez de la República",
      "Un recurso extraordinario de casación",
      "Una sanción disciplinaria al empleador"
    ],
    correctAnswer: 0,
    category: 'general',
    difficulty: 'medium'
  },
  {
    id: 13,
    question: "En defensa judicial laboral de la ESAP, el término ordinario para contestar una demanda de nulidad y restablecimiento es de:",
    options: ["10 días", "15 días", "30 días", "5 días"],
    correctAnswer: 2,
    category: 'esap',
    difficulty: 'hard'
  },
  {
    id: 14,
    question: "¿Cuál es la norma vigente que regula el Código General Disciplinario en Colombia?",
    options: [
      "Ley 734 de 2002",
      "Ley 1952 de 2019 (modificada por la Ley 2094 de 2021)",
      "Ley 1437 de 2011",
      "Ley 909 de 2004"
    ],
    correctAnswer: 1,
    category: 'colombia',
    difficulty: 'medium'
  },
  {
    id: 15,
    question: "¿Quién ejerce el control disciplinario preferente sobre los servidores de la ESAP?",
    options: [
      "La Fiscalía General de la Nación",
      "La Procuraduría General de la Nación",
      "La Contraloría General de la República",
      "El Defensor del Pueblo"
    ],
    correctAnswer: 1,
    category: 'esap',
    difficulty: 'medium'
  },
  {
    id: 16,
    question: "En el proceso disciplinario, la etapa en la que se investigan los hechos para determinar si constituyen falta es:",
    options: [
      "Juzgamiento",
      "Indagación previa o investigación disciplinaria",
      "Archivo definitivo",
      "Audiencia pública"
    ],
    correctAnswer: 1,
    category: 'general',
    difficulty: 'medium'
  },
  {
    id: 17,
    question: "¿Qué sigla identifica al Modelo Estándar de Control Interno para el Estado colombiano aplicable en la ESAP?",
    options: ["MECI", "MIPG", "SIGUD", "RSE"],
    correctAnswer: 0,
    category: 'esap',
    difficulty: 'easy'
  },
  {
    id: 18,
    question: "¿Cuál es la finalidad de la Oficina de Control Interno de Gestión en la ESAP?",
    options: [
      "Sancionar penalmente a los funcionarios",
      "Evaluar de forma independiente la eficiencia del sistema de control interno",
      "Ejecutar el presupuesto de la entidad",
      "Representar judicialmente a la Escuela"
    ],
    correctAnswer: 1,
    category: 'esap',
    difficulty: 'medium'
  },
  {
    id: 19,
    question: "¿Qué componente evalúa los riesgos institucionales dentro del marco de Control Interno?",
    options: [
      "El plan estratégico de compras",
      "La administración de riesgos (identificación, análisis y valoración)",
      "La nómina de la entidad",
      "La cantidad de quejas recibidas en ventanilla"
    ],
    correctAnswer: 1,
    category: 'general',
    difficulty: 'medium'
  },
  {
    id: 20,
    question: "¿Qué es el \"Retén Social\" en el ámbito laboral público colombiano?",
    options: [
      "Un límite al salario máximo de los congresistas",
      "Una protección de estabilidad laboral reforzada para ciertos grupos vulnerables",
      "Un impuesto para la seguridad social",
      "Una retención en la fuente aplicada a contratistas"
    ],
    correctAnswer: 1,
    category: 'colombia',
    difficulty: 'medium'
  },
  {
    id: 21,
    question: "¿Cuál de las siguientes es una sanción aplicable por faltas gravísimas cometidas con dolo en derecho disciplinario?",
    options: [
      "Amonestación escrita",
      "Destitución e inhabilidad general",
      "Suspensión provisional por 15 días",
      "Traslado de puesto de trabajo"
    ],
    correctAnswer: 1,
    category: 'general',
    difficulty: 'hard'
  },
  {
    id: 22,
    question: "En el marco de MIPG, el Control Interno se ubica en cuál dimensión de gestión y desempeño:",
    options: [
      "Dimensión de Talento Humano",
      "Dimensión de Dirección y Planeación",
      "Dimensión de Control Interno",
      "Dimensión de Información y Comunicación"
    ],
    correctAnswer: 2,
    category: 'colombia',
    difficulty: 'hard'
  },
  {
    id: 23,
    question: "La figura mediante la cual el Estado recupera lo pagado por condenas debido al actuar doloso de sus servidores se llama:",
    options: [
      "Acción de tutela",
      "Acción de repetición",
      "Acción popular",
      "Conciliación extrajudicial"
    ],
    correctAnswer: 1,
    category: 'colombia',
    difficulty: 'hard'
  },
  {
    id: 24,
    question: "Las auditorías internas de gestión en la ESAP se programan anualmente a través del documento:",
    options: [
      "Plan Anual de Auditorías (PAA)",
      "Presupuesto general de inversión",
      "Manual de funciones y competencias",
      "Plan Estratégico Institucional"
    ],
    correctAnswer: 0,
    category: 'esap',
    difficulty: 'medium'
  },
  {
    id: 25,
    question: "¿Qué principio garantiza que nadie sea juzgado dos veces por el mismo hecho en materia disciplinaria?",
    options: [
      "Presunción de inocencia",
      "Non bis in idem",
      "Debido proceso",
      "Contradicción"
    ],
    correctAnswer: 1,
    category: 'general',
    difficulty: 'easy'
  }
];

const getRandomQuestions = (pool: Question[], count: number = 10): Question[] => {
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

interface ErrorGamePageProps {
  onRetry?: () => void;
  onGoHome?: () => void;
  debug?: {
    message?: string;
    stack?: string;
    componentStack?: string;
  };
}

export function ErrorGamePage({ onRetry, onGoHome, debug }: ErrorGamePageProps) {
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>(() => getRandomQuestions(questionsPool));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [streak, setStreak] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [copied, setCopied] = useState(false);
  
  // Game metrics
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalTimeTaken, setTotalTimeTaken] = useState(0);
  const [baseScore, setBaseScore] = useState(0); // Puntos antes de la penalidad de tiempo
  
  // Leaderboard states
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const currentQuestion = selectedQuestions[currentQuestionIndex] || questionsPool[0];
  const totalQuestions = selectedQuestions.length || 10;

  useEffect(() => {
    if (debug) {
      console.group('%c🚨 DIAGNÓSTICO DE ERROR 🚨', 'color: #ef4444; font-size: 14px; font-weight: bold;');
      if (debug.message) console.error('Mensaje de error:', debug.message);
      if (debug.stack) console.error('Stack Trace:\n', debug.stack);
      if (debug.componentStack) console.error('Component Stack:\n', debug.componentStack);
      console.groupEnd();
    }
  }, [debug]);

  // Load leaderboard from API with localStorage fallback
  const fetchLeaderboard = async () => {
    try {
      const response = await apiClient.get<any>('/legal/api/v1/configurations/error_game_leaderboard');
      if (response && response.value) {
        setLeaderboard(response.value);
        localStorage.setItem('esap_error_game_leaderboard', JSON.stringify(response.value));
      } else {
        loadLocalLeaderboard();
      }
    } catch (e) {
      console.error('Error fetching leaderboard from API, falling back to localStorage:', e);
      loadLocalLeaderboard();
    }
  };

  const loadLocalLeaderboard = () => {
    try {
      const saved = localStorage.getItem('esap_error_game_leaderboard');
      if (saved) {
        setLeaderboard(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading local leaderboard', e);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Track start time
  useEffect(() => {
    if (currentQuestionIndex === 0 && !gameFinished && !startTime) {
      setStartTime(Date.now());
    }
  }, [currentQuestionIndex, gameFinished, startTime]);

  // Question countdown timer logic
  useEffect(() => {
    if (selectedAnswer !== null || gameFinished) return;
    if (timeLeft === 0) {
      handleAnswerSelect(-1); // Mark as timeout
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, selectedAnswer, gameFinished]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answerIndex);
    const correct = answerIndex === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    setAnsweredQuestions(prev => prev + 1);

    if (correct) {
      const newStreak = streak + 1;
      let pointsToAdd = 50; // 50 puntos por respuesta correcta
      
      if (newStreak % 3 === 0) {
        pointsToAdd += 30; // 30 puntos extra cada 3 correctas seguidas
      }
      
      setBaseScore(prev => prev + pointsToAdd);
      setStreak(newStreak);
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setTimeLeft(15);
      } else {
        // Calculate final time and score
        const finalTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        setTotalTimeTaken(finalTime);
        // El score final será calculado en base al baseScore - finalTime, 
        // pero evitamos números negativos usando Math.max
        setScore(Math.max(0, (baseScore + (correct ? 50 + ((streak + 1) % 3 === 0 ? 30 : 0) : 0)) - finalTime));
        setGameFinished(true);
      }
    }, 2000);
  };

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const newEntry: LeaderboardEntry = {
      id: Date.now().toString(),
      name: playerName.trim(),
      score: score,
      date: new Date().toLocaleDateString()
    };

    const newLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Keep top 10

    setLeaderboard(newLeaderboard);
    localStorage.setItem('esap_error_game_leaderboard', JSON.stringify(newLeaderboard));
    setScoreSubmitted(true);

    try {
      await apiClient.put('/legal/api/v1/configurations/error_game_leaderboard', {
        value: newLeaderboard,
        module: 'general',
        description: 'Error Boundary Mini-Game Leaderboard'
      });
    } catch (err) {
      console.error('Error saving leaderboard to database:', err);
    }
  };

  const resetGame = () => {
    setSelectedQuestions(getRandomQuestions(questionsPool));
    setCurrentQuestionIndex(0);
    setScore(0);
    setBaseScore(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setGameFinished(false);
    setStreak(0);
    setAnsweredQuestions(0);
    setTimeLeft(15);
    setScoreSubmitted(false);
    setPlayerName('');
    setStartTime(Date.now());
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('soportesuperapp@esap.edu.co');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'esap': return { bg: 'bg-blue-100 text-blue-700', icon: 'text-blue-500', label: 'ESAP' };
      case 'colombia': return { bg: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-500', label: 'COLOMBIA' };
      case 'general': return { bg: 'bg-indigo-100 text-indigo-700', icon: 'text-indigo-500', label: 'CULTURA GENERAL' };
      default: return { bg: 'bg-slate-100 text-slate-700', icon: 'text-slate-500', label: 'PREGUNTA' };
    }
  };

  const theme = getCategoryTheme(currentQuestion.category);

  return (
    <div className="min-h-screen bg-[#003DA5] text-slate-800 flex items-center justify-center p-4 relative font-sans overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#003DA5] to-[#001f54] z-0 pointer-events-none" />
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/20 blur-3xl pointer-events-none z-0" />
      
      <div className="max-w-4xl w-full relative z-10 py-8">
        
        {/* Header Section */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-8">
            <ESAPLogo 
              variant="white"
              className="h-20 md:h-24 w-auto drop-shadow-sm hover:drop-shadow-md transition-all duration-300 hover:scale-105" 
            />
          </div>

          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4 shadow-sm border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Problema Técnico Detectado
          </div>
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight drop-shadow-md">
            Oops, algo no salió como esperábamos
          </h1>
          <p className="text-blue-100 text-base md:text-lg max-w-xl mx-auto font-medium">
            Nuestro equipo técnico ya está trabajando para solucionarlo. Mientras esperas, relájate y pon a prueba tus conocimientos con nuestro mini-quiz.
          </p>
        </motion.div>

        {/* Game Container */}
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden relative"
        >
          {/* Game Header */}
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center border border-amber-200 text-amber-600 shadow-sm">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-0.5">PUNTUACION BASE</span>
                <motion.span 
                  className="font-black tracking-wide leading-none text-slate-800"
                  key={baseScore}
                  animate={{ scale: [1, 1.2, 1] }}
                  style={{ fontSize: '1.5rem' }}
                >
                  {baseScore} <span className="text-sm font-bold text-amber-500">pts</span>
                </motion.span>
              </div>
            </div>

            {/* Timer */}
            {!gameFinished && (
              <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-slate-200 bg-white shadow-sm w-full sm:w-auto">
                <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-red-500' : 'text-blue-500'}`} />
                <span className={`font-mono text-sm font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
                  00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                </span>
                <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <motion.div 
                    className={`h-full ${timeLeft <= 5 ? 'bg-red-500' : 'bg-blue-500'}`}
                    animate={{ width: `${(timeLeft / 15) * 100}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>
            )}

            <div className="text-right">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-0.5">PROGRESO</span>
              <span className="font-extrabold leading-none text-slate-800" style={{ fontSize: '1.125rem' }}>
                {answeredQuestions} <span className="text-slate-400 font-medium">/</span> {totalQuestions}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5">
            <motion.div
              className="h-full bg-blue-600 rounded-r-full"
              initial={{ width: 0 }}
              animate={{ width: `${(answeredQuestions / totalQuestions) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Streak Banner */}
          <AnimatePresence>
            {streak > 1 && !gameFinished && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-amber-50 border-b border-amber-100 text-center py-2 flex items-center justify-center gap-2 overflow-hidden"
              >
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                <span className="text-amber-700 font-bold text-xs tracking-wider uppercase">
                  ¡Racha de {streak}! Multiplicador +{streak * 5} pts
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {!gameFinished ? (
            <div className="p-6 md:p-10 relative">
              {/* Category Badge */}
              <div className="flex justify-center mb-6">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider flex items-center gap-2 ${theme.bg}`}>
                  <Brain className={`w-4 h-4 ${theme.icon}`} />
                  {theme.label}
                </span>
              </div>

              {/* Question */}
              <motion.div
                key={currentQuestion.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-8 text-center leading-tight max-w-2xl mx-auto">
                  {currentQuestion.question}
                </h2>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
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
                        className={`p-5 rounded-2xl text-left border-2 transition-all duration-300 font-semibold relative overflow-hidden flex items-center justify-between group outline-none focus:ring-4 focus:ring-blue-500/20 ${
                          showCorrect
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : showIncorrect
                            ? 'bg-red-50 border-red-500 text-red-800'
                            : isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                        whileHover={selectedAnswer === null ? { scale: 1.02 } : {}}
                        whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                            showCorrect
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : showIncorrect
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'bg-slate-100 border-slate-200 text-slate-400 group-hover:bg-white group-hover:border-blue-300 group-hover:text-blue-500'
                          }`}>
                            {showCorrect ? (
                              <CheckCircle className="w-5 h-5 text-white" />
                            ) : showIncorrect ? (
                              <XCircle className="w-5 h-5 text-white" />
                            ) : (
                              <span className="font-black text-sm">
                                {String.fromCharCode(65 + index)}
                              </span>
                            )}
                          </div>
                          <span className="text-sm md:text-base leading-snug">{option}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Feedback */}
                <AnimatePresence>
                  {selectedAnswer !== null && (
                    <motion.div
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -15, opacity: 0 }}
                      className={`mt-6 p-4 rounded-2xl flex items-center gap-4 max-w-3xl mx-auto border ${
                        selectedAnswer === -1 
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : isCorrect
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                    >
                      {selectedAnswer === -1 ? (
                        <>
                          <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                            <Clock className="w-6 h-6 animate-pulse" />
                          </div>
                          <div>
                            <p className="font-bold text-base">¡Se agotó el tiempo!</p>
                            <p className="text-sm opacity-90">La respuesta era: {currentQuestion.options[currentQuestion.correctAnswer]}</p>
                          </div>
                        </>
                      ) : isCorrect ? (
                        <>
                          <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                            <CheckCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-base">¡Respuesta Correcta!</p>
                            <p className="text-sm opacity-90">
                              +50 puntos
                              {(streak + 1) % 3 === 0 && ` | ¡Racha de 3! +30 puntos`}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-3 bg-red-100 rounded-xl text-red-600">
                            <XCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-base">Respuesta Incorrecta</p>
                            <p className="text-sm opacity-90">La correcta era: {currentQuestion.options[currentQuestion.correctAnswer]}</p>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          ) : (
            /* Game Over / Leaderboard Screen */
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="p-6 md:p-10"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Score & Submit Section */}
                <div className="text-center lg:text-left flex flex-col justify-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto lg:mx-0 mb-6 shadow-xl rotate-12">
                    <Award className="w-10 h-10 text-white" />
                  </div>

                  <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
                    ¡Juego Terminado!
                  </h2>
                  <p className="text-slate-500 mb-6 text-base">
                    Puntaje basado en aciertos y racha, penalizado por tu tiempo total.
                  </p>

                  <div className="flex flex-col gap-2 mb-6 w-full max-w-sm mx-auto lg:mx-0">
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
                      <span className="text-sm font-bold text-slate-500">Puntaje Acumulado:</span>
                      <span className="font-bold text-slate-800">{baseScore} pts</span>
                    </div>
                    <div className="flex justify-between items-center bg-red-50 border border-red-100 px-4 py-2 rounded-xl">
                      <span className="text-sm font-bold text-red-500">Penalidad de Tiempo:</span>
                      <span className="font-bold text-red-600">-{totalTimeTaken} seg</span>
                    </div>
                  </div>

                  <div className="inline-flex flex-col items-center lg:items-start bg-blue-50 border border-blue-200 px-8 py-5 rounded-2xl mb-8 shadow-sm self-center lg:self-start w-full max-w-sm mx-auto lg:mx-0">
                    <span className="text-blue-500 text-xs font-bold tracking-wider uppercase mb-1">PUNTUACIÓN FINAL</span>
                    <span className="text-blue-700 font-black tracking-tight" style={{ fontSize: '3rem', lineHeight: 1 }}>{score}</span>
                  </div>

                  {!scoreSubmitted ? (
                    <form onSubmit={handleScoreSubmit} className="mb-8 w-full max-w-sm mx-auto lg:mx-0">
                      <label htmlFor="playerName" className="block text-sm font-bold text-slate-700 mb-2">
                        Guarda tu puntaje en el ranking:
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="playerName"
                          type="text"
                          required
                          maxLength={15}
                          placeholder="Tu nombre o alias..."
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                        />
                        <button
                          type="submit"
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-sm"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-center lg:justify-start gap-3 max-w-sm mx-auto lg:mx-0">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span className="font-bold">¡Puntaje guardado exitosamente!</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                    <motion.button
                      onClick={resetGame}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Jugar de Nuevo
                    </motion.button>

                    {onRetry && (
                      <motion.button
                        onClick={onRetry}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 transition-colors text-sm"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reintentar Carga
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Leaderboard Section */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-inner overflow-hidden flex flex-col h-[400px]">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <ListOrdered className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">Top Mejores Puntajes</h3>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {leaderboard.length === 0 ? (
                      <div className="text-center text-slate-400 py-10">
                        <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">Aún no hay puntajes.</p>
                        <p className="text-sm">¡Sé el primero en el ranking!</p>
                      </div>
                    ) : (
                      leaderboard.map((entry, index) => (
                        <div 
                          key={entry.id} 
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            index === 0 ? 'bg-amber-50 border-amber-200' :
                            index === 1 ? 'bg-slate-100 border-slate-300' :
                            index === 2 ? 'bg-orange-50 border-orange-200' :
                            'bg-white border-slate-100 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-amber-400 text-white' :
                              index === 1 ? 'bg-slate-300 text-slate-700' :
                              index === 2 ? 'bg-orange-300 text-white' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{entry.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase">{entry.date}</p>
                            </div>
                          </div>
                          <div className="font-black text-blue-600">
                            {entry.score} <span className="text-xs font-medium text-slate-400">pts</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Support Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-5 text-left">
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-indigo-600">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base mb-1">¿Persiste el problema técnico?</h4>
              <p className="text-slate-500 text-sm leading-relaxed">
                Envíanos un mensaje por Microsoft Teams o escríbenos a{' '}
                <span className="text-indigo-600 font-semibold select-all bg-indigo-50 px-2 py-0.5 rounded-md">soportesuperapp@esap.edu.co</span>
              </p>
            </div>
          </div>
          <div className="w-full md:w-auto shrink-0">
            <button
              onClick={handleCopyEmail}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all text-sm font-bold shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
              {copied ? '¡Copiado!' : 'Copiar Correo'}
            </button>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-10 text-slate-400 text-xs font-medium tracking-wide">
          <p>© {new Date().getFullYear()} Escuela Superior de Administración Pública</p>
        </div>
        
      </div>
    </div>
  );
}
