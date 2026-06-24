import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import './App.css'
import { auth, db, googleProvider, saveProgress, loadProgress, saveSubscription, getSubscription, getTrialStatus, getLeaderboard, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup, sendPasswordResetEmail, updateProfile } from './firebase.js'
import { LANGUAGES, getTranslation } from './translations.js'

const LangContext = createContext({ t: getTranslation('ar'), lang: 'ar', setLang: () => {} })
function useLang() { return useContext(LangContext) }

// ── Levels ────────────────────────────────────────────────────────────────────
const LEVELS = [
  { id: 'A1', label: 'مبتدئ جداً', color: 'teal' },
  { id: 'A2', label: 'مبتدئ', color: 'green' },
  { id: 'B1', label: 'متوسط', color: 'blue' },
  { id: 'B2', label: 'فوق المتوسط', color: 'indigo' },
  { id: 'C1', label: 'متقدم', color: 'purple' },
  { id: 'C2', label: 'محترف', color: 'red' },
]
const LEVEL_MAP = Object.fromEntries(LEVELS.map(l => [l.id, l]))

// ── Lessons ───────────────────────────────────────────────────────────────────
const LESSONS = [
  // A1
  {
    id: 1, level: 'A1', title: 'التحيات والتعارف',
    englishTitle: 'Greetings & Introductions',
    icon: '👋', duration: '١٠ دقائق',
    content: [
      { type: 'text', body: 'تعلّم كيفية تحية الناس هو الخطوة الأولى في تعلم اللغة الإنجليزية:' },
      { type: 'phrase', items: [
        { en: 'Hello / Hi', ar: 'مرحبا / أهلاً', note: 'تُستخدم في المواقف الرسمية وغير الرسمية' },
        { en: 'Good morning', ar: 'صباح الخير', note: 'تحية الصباح' },
        { en: 'Good afternoon', ar: 'مساء الخير', note: 'بعد الظهر' },
        { en: 'Good evening', ar: 'مساء الخير', note: 'في المساء' },
        { en: 'How are you?', ar: 'كيف حالك؟', note: 'للسؤال عن الحال' },
        { en: 'Nice to meet you', ar: 'سعيد بلقائك', note: 'عند مقابلة شخص للمرة الأولى' },
        { en: 'Goodbye / Bye', ar: 'مع السلامة', note: 'وداع' },
        { en: 'See you later', ar: 'أراك لاحقاً', note: 'وداع غير رسمي' },
      ]},
      { type: 'text', body: 'عند تقديم نفسك، قل: "My name is [اسمك]" أو ببساطة "I\'m [اسمك]"' },
      { type: 'example', label: 'مثال على محادثة', body: 'A: Hello! My name is Sarah. Nice to meet you.\nB: Hi Sarah! I\'m Tom. How are you?\nA: I\'m doing great, thank you!\nB: That\'s wonderful. See you later!' },
    ],
  },
  {
    id: 2, level: 'A1', title: 'الأرقام والعد',
    englishTitle: 'Numbers & Counting',
    icon: '🔢', duration: '١٢ دقيقة',
    content: [
      { type: 'text', body: 'الأرقام ضرورية في حياتنا اليومية — للتسوق، وقراءة الوقت، وذكر العمر.' },
      { type: 'phrase', items: [
        { en: 'One, Two, Three', ar: 'واحد، اثنان، ثلاثة', note: '١، ٢، ٣' },
        { en: 'Four, Five, Six', ar: 'أربعة، خمسة، ستة', note: '٤، ٥، ٦' },
        { en: 'Seven, Eight, Nine, Ten', ar: 'سبعة، ثمانية، تسعة، عشرة', note: '٧، ٨، ٩، ١٠' },
        { en: 'Eleven, Twelve, Thirteen', ar: 'أحد عشر، اثنا عشر، ثلاثة عشر', note: '١١، ١٢، ١٣' },
        { en: 'Twenty, Thirty, Forty', ar: 'عشرون، ثلاثون، أربعون', note: '٢٠، ٣٠، ٤٠' },
        { en: 'Hundred / Thousand / Million', ar: 'مئة / ألف / مليون', note: '١٠٠ / ١٠٠٠ / ١,٠٠٠,٠٠٠' },
      ]},
      { type: 'example', label: 'أمثلة', body: '"I have two brothers." — لديّ أخان\n"The shirt costs fifteen dollars." — القميص بخمسة عشر دولاراً\n"She is twenty-three years old." — عمرها ثلاثة وعشرون سنة' },
    ],
  },
  {
    id: 3, level: 'A1', title: 'الألوان والأشياء اليومية',
    englishTitle: 'Colors & Everyday Objects',
    icon: '🎨', duration: '١٠ دقائق',
    content: [
      { type: 'text', body: 'تعلّم أسماء الألوان والأشياء اليومية يساعدك على وصف العالم من حولك.' },
      { type: 'phrase', items: [
        { en: 'Red / Blue / Green', ar: 'أحمر / أزرق / أخضر', note: 'ألوان أساسية' },
        { en: 'White / Black / Yellow', ar: 'أبيض / أسود / أصفر', note: 'ألوان أساسية' },
        { en: 'Book / Pen / Table', ar: 'كتاب / قلم / طاولة', note: 'أشياء دراسية' },
        { en: 'House / Door / Window', ar: 'بيت / باب / نافذة', note: 'أجزاء المنزل' },
        { en: 'Water / Food / Bread', ar: 'ماء / طعام / خبز', note: 'أساسيات الأكل' },
        { en: 'Car / Bus / Phone', ar: 'سيارة / حافلة / هاتف', note: 'وسائل النقل والتواصل' },
      ]},
      { type: 'example', label: 'أمثلة', body: '"The book is on the table." — الكتاب على الطاولة\n"I have a red car." — لديّ سيارة حمراء\n"She drinks water every morning." — تشرب الماء كل صباح' },
    ],
  },
  // A2
  {
    id: 4, level: 'A2', title: 'الأفعال الشائعة',
    englishTitle: 'Common Verbs',
    icon: '⚡', duration: '١٥ دقيقة',
    content: [
      { type: 'text', body: 'الأفعال هي كلمات الفعل — تصف ما نقوم به. إليك أكثر الأفعال شيوعاً في الإنجليزية:' },
      { type: 'phrase', items: [
        { en: 'Be (am / is / are)', ar: 'يكون / هو / هي', note: 'للوصف أو الوجود' },
        { en: 'Have', ar: 'يملك / عنده', note: 'للامتلاك' },
        { en: 'Do', ar: 'يفعل / يقوم بـ', note: 'للتنفيذ' },
        { en: 'Go', ar: 'يذهب', note: 'للتنقل' },
        { en: 'Say / Tell', ar: 'يقول / يخبر', note: 'للكلام' },
        { en: 'Get', ar: 'يحصل على / يصبح', note: 'للحصول' },
        { en: 'Make', ar: 'يصنع / يجعل', note: 'للإنشاء' },
        { en: 'Know', ar: 'يعرف', note: 'للمعرفة' },
        { en: 'Think', ar: 'يفكر / يعتقد', note: 'للتفكير' },
        { en: 'Want / Need', ar: 'يريد / يحتاج', note: 'للرغبة والحاجة' },
      ]},
      { type: 'example', label: 'أمثلة في جمل', body: '"I am a student." — أنا طالب\n"She has a car." — لديها سيارة\n"They go to school every day." — يذهبون للمدرسة كل يوم\n"He makes breakfast." — يُعدّ وجبة الفطور' },
    ],
  },
  {
    id: 5, level: 'A2', title: 'التسوق',
    englishTitle: 'Shopping',
    icon: '🛍️', duration: '١٥ دقيقة',
    content: [
      { type: 'text', body: 'عند التسوق ستحتاج إلى هذه العبارات للسؤال عن الأسعار واختيار المنتجات.' },
      { type: 'phrase', items: [
        { en: 'How much is this?', ar: 'بكم هذا؟', note: 'السؤال عن السعر' },
        { en: "I'd like to buy...", ar: 'أريد شراء...', note: 'للطلب' },
        { en: 'Do you have...?', ar: 'هل عندكم...؟', note: 'للاستفسار' },
        { en: "It's too expensive.", ar: 'إنه غالٍ جداً.', note: 'رأيك في السعر' },
        { en: "I'll take it.", ar: 'سآخذه.', note: 'قرار الشراء' },
        { en: 'Can I pay by card?', ar: 'هل يمكنني الدفع ببطاقة؟', note: 'طريقة الدفع' },
        { en: 'Do you have a smaller/bigger size?', ar: 'هل عندكم مقاس أصغر/أكبر؟', note: 'للملابس' },
        { en: "I'm just looking.", ar: 'أنا فقط أتفرج.', note: 'إذا لم تريد شراء الآن' },
      ]},
      { type: 'example', label: 'محادثة في المحل', body: 'Customer: Excuse me, how much is this jacket?\nShop: It\'s forty-five dollars.\nCustomer: Do you have it in blue?\nShop: Yes, here you go!\nCustomer: Great, I\'ll take it. Can I pay by card?' },
    ],
  },
  {
    id: 6, level: 'A2', title: 'المطعم والطعام',
    englishTitle: 'Restaurant & Food',
    icon: '🍽️', duration: '١٥ دقيقة',
    content: [
      { type: 'text', body: 'تعلّم كيف تطلب الطعام وتتحدث في المطعم بالإنجليزية.' },
      { type: 'phrase', items: [
        { en: 'A table for two, please.', ar: 'طاولة لشخصين من فضلك.', note: 'عند الدخول' },
        { en: 'Can I see the menu?', ar: 'هل يمكنني رؤية القائمة؟', note: 'طلب القائمة' },
        { en: "I'd like to order...", ar: 'أريد أن أطلب...', note: 'الطلب' },
        { en: 'What do you recommend?', ar: 'ماذا تنصح؟', note: 'طلب توصية' },
        { en: "I'm allergic to...", ar: 'أنا حساس لـ...', note: 'حساسية غذائية' },
        { en: 'The bill, please.', ar: 'الحساب من فضلك.', note: 'طلب الفاتورة' },
        { en: 'It was delicious!', ar: 'كان لذيذاً!', note: 'إطراء الطعام' },
      ]},
      { type: 'example', label: 'محادثة في المطعم', body: 'Waiter: Good evening! Do you have a reservation?\nCustomer: No, a table for two please.\nWaiter: Here\'s the menu.\nCustomer: What do you recommend?\nWaiter: Our pasta is excellent!\nCustomer: I\'ll have that. And the bill when you\'re ready.' },
    ],
  },
  // B1
  {
    id: 7, level: 'B1', title: 'المضارع البسيط والمستمر',
    englishTitle: 'Present Simple & Continuous',
    icon: '🕐', duration: '٢٠ دقيقة',
    content: [
      { type: 'text', body: 'في الإنجليزية يوجد نوعان رئيسيان من المضارع، لكل منهما استخدام مختلف:' },
      { type: 'phrase', items: [
        { en: 'I work every day.', ar: 'أعمل كل يوم.', note: 'مضارع بسيط — عادة متكررة' },
        { en: 'I am working now.', ar: 'أنا أعمل الآن.', note: 'مضارع مستمر — حدث يجري الآن' },
        { en: 'She plays football.', ar: 'هي تلعب كرة القدم.', note: 'حقيقة عامة' },
        { en: 'She is playing football.', ar: 'هي تلعب كرة القدم الآن.', note: 'تلعب في هذه اللحظة' },
      ]},
      { type: 'text', body: 'ملاحظة مهمة: بعض الأفعال مثل (know, love, believe) لا تُستخدم عادةً مع المستمر.' },
      { type: 'example', label: 'مقارنة', body: 'Simple: "I drink coffee every morning." — أشرب القهوة كل صباح (عادة)\nContinuous: "I am drinking coffee right now." — أنا أشرب القهوة الآن' },
    ],
  },
  {
    id: 8, level: 'B1', title: 'الماضي البسيط',
    englishTitle: 'Simple Past Tense',
    icon: '📅', duration: '٢٠ دقيقة',
    content: [
      { type: 'text', body: 'يُستخدم الماضي البسيط للتعبير عن أحداث انتهت في الماضي. معظم الأفعال تأخذ "ed"، لكن هناك أفعال شاذة مهمة.' },
      { type: 'phrase', items: [
        { en: 'Walk → Walked', ar: 'يمشي → مشى', note: 'فعل منتظم' },
        { en: 'Go → Went', ar: 'يذهب → ذهب', note: 'فعل شاذ' },
        { en: 'Have → Had', ar: 'يملك → امتلك', note: 'فعل شاذ' },
        { en: 'See → Saw', ar: 'يرى → رأى', note: 'فعل شاذ' },
        { en: "I didn't go.", ar: 'لم أذهب.', note: "النفي: didn't + مصدر" },
        { en: 'Did you go?', ar: 'هل ذهبت؟', note: 'السؤال: Did + فاعل + مصدر' },
      ]},
      { type: 'example', label: 'أمثلة', body: '"Yesterday I walked to the park." — أمس مشيت إلى الحديقة\n"We went to the cinema last Friday." — ذهبنا للسينما الجمعة الماضية\n"Did you eat breakfast?" — هل أكلت الفطور؟' },
    ],
  },
  {
    id: 9, level: 'B1', title: 'في المطار',
    englishTitle: 'At the Airport',
    icon: '✈️', duration: '١٨ دقيقة',
    content: [
      { type: 'text', body: 'في المطار ستحتاج إلى هذه العبارات الأساسية للتواصل مع موظفي المطار.' },
      { type: 'phrase', items: [
        { en: 'Where is the check-in counter?', ar: 'أين كاونتر تسجيل الوصول؟', note: 'عند الوصول للمطار' },
        { en: "I'd like a window seat.", ar: 'أريد مقعداً بجانب النافذة.', note: 'اختيار المقعد' },
        { en: 'Is this flight on time?', ar: 'هل هذه الرحلة في موعدها؟', note: 'استفسار عن التوقيت' },
        { en: 'Where is gate B12?', ar: 'أين البوابة B12؟', note: 'إيجاد البوابة' },
        { en: 'My luggage is lost.', ar: 'أمتعتي ضائعة.', note: 'مشكلة الأمتعة' },
        { en: 'I have nothing to declare.', ar: 'ليس لديّ شيء للتصريح.', note: 'في الجمارك' },
        { en: 'My passport, please.', ar: 'جواز سفري، من فضلك.', note: 'عند الحدود' },
      ]},
      { type: 'example', label: 'محادثة في المطار', body: 'Agent: Can I see your passport and ticket?\nPassenger: Here you go.\nAgent: Window or aisle seat?\nPassenger: A window seat please.\nAgent: Your boarding pass. Gate B12, boarding at 2pm.' },
    ],
  },
  {
    id: 10, level: 'B1', title: 'المستقبل',
    englishTitle: 'Future Tense (will / going to)',
    icon: '🚀', duration: '١٨ دقيقة',
    content: [
      { type: 'text', body: 'يوجد طريقتان شائعتان للتعبير عن المستقبل في الإنجليزية: will و going to.' },
      { type: 'phrase', items: [
        { en: 'I will call you.', ar: 'سأتصل بك.', note: 'will — قرار آني أو وعد' },
        { en: 'I am going to travel.', ar: 'سأسافر. (مخطط)', note: 'going to — خطة مسبقة' },
        { en: 'Will you help me?', ar: 'هل ستساعدني؟', note: 'سؤال بـ will' },
        { en: 'It will rain tomorrow.', ar: 'ستمطر غداً.', note: 'توقع مستقبلي' },
      ]},
      { type: 'example', label: 'الفرق بين will و going to', body: '"I will help you." — (قرار الآن)\n"I am going to help you." — (قررت هذا من قبل)\n\nكلاهما صحيح لكن السياق يحدد الأنسب.' },
    ],
  },
  // B2
  {
    id: 11, level: 'B2', title: 'عند الطبيب',
    englishTitle: 'At the Doctor',
    icon: '🏥', duration: '٢٠ دقيقة',
    content: [
      { type: 'text', body: 'وصف الأعراض للطبيب بالإنجليزية مهارة أساسية عند السفر أو العيش في بيئة ناطقة بالإنجليزية.' },
      { type: 'phrase', items: [
        { en: 'I have a headache.', ar: 'عندي صداع.', note: 'وصف ألم الرأس' },
        { en: 'I feel dizzy / nauseous.', ar: 'أشعر بالدوار / الغثيان.', note: 'أعراض أخرى' },
        { en: 'I have a fever / sore throat.', ar: 'عندي حمى / التهاب في الحلق.', note: 'أعراض شائعة' },
        { en: 'The pain started yesterday.', ar: 'بدأ الألم بالأمس.', note: 'وقت بداية الأعراض' },
        { en: 'I\'m allergic to penicillin.', ar: 'أنا حساس للبنسلين.', note: 'حساسية الدواء' },
        { en: 'How often should I take this?', ar: 'كم مرة يجب أن آخذ هذا؟', note: 'جرعة الدواء' },
      ]},
      { type: 'example', label: 'محادثة مع الطبيب', body: 'Doctor: What seems to be the problem?\nPatient: I have a terrible headache and a fever.\nDoctor: How long have you had these symptoms?\nPatient: Since yesterday morning.\nDoctor: Take this medicine twice a day for five days.' },
    ],
  },
  {
    id: 12, level: 'B2', title: 'الجمل الشرطية',
    englishTitle: 'Conditionals',
    icon: '🔀', duration: '٢٥ دقيقة',
    content: [
      { type: 'text', body: 'الجمل الشرطية تعبّر عن مواقف تعتمد على شرط معين. هناك أربعة أنواع رئيسية:' },
      { type: 'phrase', items: [
        { en: 'If you heat water, it boils.', ar: 'إذا سخّنت الماء، يغلي.', note: 'الشرطي الصفري — حقائق عامة' },
        { en: 'If it rains, I will stay home.', ar: 'إذا أمطرت، سأبقى في المنزل.', note: 'الشرطي الأول — مستقبل حقيقي' },
        { en: 'If I had money, I would travel.', ar: 'لو كان عندي مال، لسافرت.', note: 'الشرطي الثاني — غير حقيقي في الحاضر' },
        { en: 'If I had studied, I would have passed.', ar: 'لو كنت درست، لكنت نجحت.', note: 'الشرطي الثالث — غير حقيقي في الماضي' },
      ]},
      { type: 'example', label: 'شرطي مختلط', body: '"If I had taken that job (past), I would be in Paris now (present)."\nلو أخذت ذلك العمل (في الماضي)، لكنت في باريس الآن.' },
    ],
  },
  // C1
  {
    id: 13, level: 'C1', title: 'في بيئة العمل',
    englishTitle: 'Business English',
    icon: '💼', duration: '٢٥ دقيقة',
    content: [
      { type: 'text', body: 'الإنجليزية في بيئة العمل لها أسلوبها الخاص من حيث الرسمية والمصطلحات.' },
      { type: 'phrase', items: [
        { en: "Let's schedule a meeting.", ar: 'لنحدد موعد اجتماع.', note: 'تحديد اجتماع' },
        { en: "I'd like to follow up on...", ar: 'أريد المتابعة بشأن...', note: 'في البريد الإلكتروني' },
        { en: 'Could you please clarify?', ar: 'هل يمكنك التوضيح من فضلك؟', note: 'طلب التوضيح' },
        { en: "I'll get back to you by Friday.", ar: 'سأرد عليك بحلول الجمعة.', note: 'التزام بموعد' },
        { en: 'We need to meet the deadline.', ar: 'يجب الالتزام بالموعد النهائي.', note: 'المواعيد النهائية' },
        { en: "Let's touch base later.", ar: 'لنتواصل لاحقاً.', note: 'تعبير شائع في العمل' },
        { en: "I'm out of office tomorrow.", ar: 'لن أكون في المكتب غداً.', note: 'الغياب عن العمل' },
      ]},
      { type: 'example', label: 'بريد إلكتروني رسمي', body: 'Subject: Follow-up on our meeting\n\nDear Mr. Smith,\nI\'d like to follow up on the points we discussed.\nCould you please send me the report by Friday?\nBest regards, Ahmed' },
    ],
  },
  {
    id: 14, level: 'C1', title: 'المبني للمجهول',
    englishTitle: 'Passive Voice',
    icon: '🔄', duration: '٢٢ دقيقة',
    content: [
      { type: 'text', body: 'المبني للمجهول يُستخدم عندما يكون الفاعل غير معروف أو غير مهم. صيغته: to be + Past Participle.' },
      { type: 'phrase', items: [
        { en: 'The book is written.', ar: 'الكتاب مكتوب.', note: 'مضارع مبني للمجهول' },
        { en: 'The car was stolen.', ar: 'السيارة سُرقت.', note: 'ماضٍ مبني للمجهول' },
        { en: 'The letter will be sent.', ar: 'ستُرسَل الرسالة.', note: 'مستقبل مبني للمجهول' },
        { en: 'English is spoken here.', ar: 'يُتحدث الإنجليزية هنا.', note: 'استخدام شائع جداً' },
      ]},
      { type: 'example', label: 'مقارنة المبني للمعلوم والمجهول', body: 'Active: "The teacher corrects the homework." — المعلم يصحح الواجب\nPassive: "The homework is corrected by the teacher." — الواجب يُصحَّح بواسطة المعلم' },
    ],
  },
  // C2
  {
    id: 15, level: 'C2', title: 'التعبيرات الاصطلاحية',
    englishTitle: 'Idioms & Expressions',
    icon: '🗣️', duration: '٣٠ دقيقة',
    content: [
      { type: 'text', body: 'التعبيرات الاصطلاحية (Idioms) هي عبارات معناها لا يُفهم من كلماتها الحرفية. إتقانها يجعل إنجليزيتك أكثر طبيعية.' },
      { type: 'phrase', items: [
        { en: 'Break a leg!', ar: 'بالتوفيق!', note: 'تمنية الحظ (خاصةً قبل العرض)' },
        { en: "It's raining cats and dogs.", ar: 'المطر يهطل بغزارة.', note: 'للتعبير عن مطر شديد' },
        { en: 'The ball is in your court.', ar: 'الأمر بيدك الآن.', note: 'قرارك أنت' },
        { en: 'Bite the bullet.', ar: 'تحمّل الأمر بشجاعة.', note: 'تحمّل موقف صعب' },
        { en: 'Hit the nail on the head.', ar: 'أصاب كبد الحقيقة.', note: 'قول الشيء الصحيح تماماً' },
        { en: 'Under the weather.', ar: 'لست بخير / مريض قليلاً.', note: 'الشعور بالمرض الخفيف' },
        { en: 'Cost an arm and a leg.', ar: 'مكلف جداً.', note: 'للتعبير عن السعر الباهظ' },
        { en: 'Burn the midnight oil.', ar: 'السهر للعمل أو الدراسة.', note: 'العمل حتى وقت متأخر' },
      ]},
      { type: 'example', label: 'استخدام في سياق', body: '"I\'ve been burning the midnight oil to finish this project."\nكنت أسهر حتى الفجر لإنهاء هذا المشروع.\n\n"The presentation is tomorrow? Break a leg!"\nالعرض غداً؟ بالتوفيق!' },
    ],
  },
  {
    id: 16, level: 'C2', title: 'التكنولوجيا والعالم الرقمي',
    englishTitle: 'Technology & Digital World',
    icon: '💻', duration: '٢٥ دقيقة',
    content: [
      { type: 'text', body: 'في عالم التكنولوجيا تسود المصطلحات الإنجليزية. تعلّم هذه المفردات ليكون حديثك التقني سلساً.' },
      { type: 'phrase', items: [
        { en: 'Artificial Intelligence (AI)', ar: 'الذكاء الاصطناعي', note: 'تقنية المستقبل' },
        { en: 'Cloud computing', ar: 'الحوسبة السحابية', note: 'تخزين البيانات عبر الإنترنت' },
        { en: 'Cybersecurity', ar: 'الأمن السيبراني', note: 'حماية الأنظمة الرقمية' },
        { en: 'Software / Hardware', ar: 'البرمجيات / المعدات', note: 'مكونات الحاسوب' },
        { en: 'To upload / download', ar: 'رفع / تنزيل', note: 'نقل الملفات' },
        { en: 'Bandwidth / Latency', ar: 'عرض الحزمة / زمن الاستجابة', note: 'مصطلحات الشبكة' },
        { en: 'User interface (UI)', ar: 'واجهة المستخدم', note: 'تصميم التطبيقات' },
      ]},
      { type: 'example', label: 'في اجتماع تقني', body: '"We need to improve our cybersecurity protocols."\nنحتاج إلى تحسين بروتوكولات الأمن السيبراني لدينا.\n\n"The new AI features will enhance the user interface."\nميزات الذكاء الاصطناعي الجديدة ستُحسّن واجهة المستخدم.' },
    ],
  },
]

// ── Quizzes ───────────────────────────────────────────────────────────────────
const QUIZZES = [
  {
    id: 1, title: 'اختبار التحيات', lessonId: 1, icon: '👋', level: 'A1',
    questions: [
      { q: 'ما التحية المناسبة في الصباح؟', options: ['Good morning', 'Good night', 'See you later', 'Goodbye'], answer: 0 },
      { q: 'ماذا تقول عند مقابلة شخص للمرة الأولى؟', options: ['See you soon', 'Nice to meet you', 'How have you been?', 'Good job'], answer: 1 },
      { q: 'أكمل الجملة: "My ___ is Ahmed."', options: ['word', 'name', 'place', 'thing'], answer: 1 },
      { q: 'ما الرد المناسب على "How are you?"', options: ['I am five', 'My name is Ali', "I'm doing well, thank you!", 'The sky is blue'], answer: 2 },
    ],
  },
  {
    id: 2, title: 'اختبار الأرقام', lessonId: 2, icon: '🔢', level: 'A1',
    questions: [
      { q: 'كيف تكتب الرقم ١٥ بالإنجليزية؟', options: ['Fifty', 'Fiveteen', 'Fifteen', 'Fiftieth'], answer: 2 },
      { q: 'ما الذي يأتي بعد "nineteen"؟', options: ['Ninety', 'Twenty', 'Twelve', 'Nineteen-one'], answer: 1 },
      { q: 'ما الكلمة الصحيحة للرقم ١٠٠٠؟', options: ['One hundred', 'Ten hundred', 'One thousand', 'One million'], answer: 2 },
      { q: 'كيف تقول "عمرها ٢٣ سنة"؟', options: ['She is twenty three.', 'She is two-three.', 'She is twenti-three.', 'She is twenty-three years old.'], answer: 3 },
    ],
  },
  {
    id: 3, title: 'اختبار التسوق', lessonId: 5, icon: '🛍️', level: 'A2',
    questions: [
      { q: 'كيف تسأل عن السعر؟', options: ['Where is it?', 'How much is this?', 'What is it?', 'When is it?'], answer: 1 },
      { q: 'ما معنى "I\'m just looking"؟', options: ['أنا أشتري الآن', 'أنا فقط أتفرج', 'أريد المساعدة', 'أريد الخروج'], answer: 1 },
      { q: 'كيف تقول "أريد شراء هذا"؟', options: ["I'd like to buy this.", "I want selling this.", "I need buying this.", "I will buy this later."], answer: 0 },
      { q: 'ما معنى "It\'s too expensive"؟', options: ['السعر مناسب', 'إنه رخيص جداً', 'إنه غالٍ جداً', 'لا أعرف السعر'], answer: 2 },
    ],
  },
  {
    id: 4, title: 'اختبار الأفعال الشائعة', lessonId: 4, icon: '⚡', level: 'A2',
    questions: [
      { q: 'ما ترجمة "He makes breakfast"؟', options: ['هو يأكل الفطور', 'هو يُعدّ الفطور', 'هو يطلب الفطور', 'هو ينام بعد الفطور'], answer: 1 },
      { q: 'أي جملة صحيحة نحوياً؟', options: ['She have a car.', 'She has a car.', 'She haves a car.', 'She is have a car.'], answer: 1 },
      { q: '"They ___ to school every day."', options: ['is going', 'goes', 'go', 'going'], answer: 2 },
      { q: 'ما معنى فعل "Know" بالعربية؟', options: ['يذهب', 'يصنع', 'يعرف', 'يملك'], answer: 2 },
    ],
  },
  {
    id: 5, title: 'اختبار المضارع', lessonId: 7, icon: '🕐', level: 'B1',
    questions: [
      { q: 'أي جملة تستخدم المضارع المستمر بشكل صحيح؟', options: ['She walk to work.', 'She is walking to work.', 'She walks to work.', 'She walked to work.'], answer: 1 },
      { q: '"I ___ coffee every morning." (عادة يومية)', options: ['am drinking', 'drank', 'drink', 'have drink'], answer: 2 },
      { q: 'أي من هذه الأفعال لا يُستخدم عادةً مع المستمر؟', options: ['run', 'walk', 'know', 'eat'], answer: 2 },
      { q: 'ما النفي الصحيح لـ "She works here"؟', options: ["She not works here", "She don't work here", "She doesn't work here", "She isn't works here"], answer: 2 },
    ],
  },
  {
    id: 6, title: 'اختبار الماضي البسيط', lessonId: 8, icon: '📅', level: 'B1',
    questions: [
      { q: 'ما الماضي البسيط لفعل "go"؟', options: ['goed', 'gone', 'went', 'go'], answer: 2 },
      { q: 'أي جملة صحيحة؟', options: ["I didn't went there.", "I didn't go there.", "I not went there.", "I did not went there."], answer: 1 },
      { q: '"She ___ a great movie last night." (see)', options: ['sees', 'seen', 'see', 'saw'], answer: 3 },
      { q: 'كيف تكوّن سؤالاً في الماضي؟', options: ['Were + subject + verb?', 'Did + subject + base verb?', 'Does + subject + past verb?', 'Subject + did + verb?'], answer: 1 },
    ],
  },
  {
    id: 7, title: 'اختبار في المطار', lessonId: 9, icon: '✈️', level: 'B1',
    questions: [
      { q: 'ماذا تقول لتطلب مقعداً بجانب النافذة؟', options: ["I'd like an aisle seat.", "I'd like a window seat.", "Give me a middle seat.", "I want to sit outside."], answer: 1 },
      { q: 'ما معنى "My luggage is lost"؟', options: ['أمتعتي ثقيلة', 'أمتعتي ضائعة', 'أمتعتي كثيرة', 'أمتعتي جاهزة'], answer: 1 },
      { q: 'ماذا تقول في الجمارك إذا لم يكن لديك شيء للتصريح؟', options: ['I have everything to declare.', 'I have something to declare.', 'I have nothing to declare.', 'I have no bags.'], answer: 2 },
      { q: 'ما معنى "Is this flight on time?"', options: ['هل الرحلة مريحة؟', 'هل الرحلة في موعدها؟', 'هل الرحلة طويلة؟', 'هل الرحلة غالية؟'], answer: 1 },
    ],
  },
  {
    id: 8, title: 'اختبار الشرطية', lessonId: 12, icon: '🔀', level: 'B2',
    questions: [
      { q: 'أي نوع من الشرطية: "If it rains, I will stay home."', options: ['الشرطي الصفري', 'الشرطي الأول', 'الشرطي الثاني', 'الشرطي الثالث'], answer: 1 },
      { q: 'أكمل: "If I had money, I ___ travel."', options: ['will', 'would', 'can', 'do'], answer: 1 },
      { q: 'أي جملة تعبر عن حقيقة علمية؟', options: ['If it rained, I would go.', 'If it rains, it will flood.', 'If you heat water, it boils.', 'If I had time, I would study.'], answer: 2 },
      { q: 'ما نوع الشرطية: "If I had studied, I would have passed."', options: ['الأول', 'الثاني', 'الثالث', 'الصفري'], answer: 2 },
    ],
  },
]

// ── Vocabulary ────────────────────────────────────────────────────────────────
const VOCAB = [
  { id: 1, word: 'Hello', type: 'interj', arabic: 'مرحبا', level: 'A1', definition: 'A greeting used when meeting someone', arabicDef: 'تحية تُستخدم عند لقاء شخص ما', example: 'Hello! How are you today?' },
  { id: 2, word: 'Book', type: 'noun', arabic: 'كتاب', level: 'A1', definition: 'A written or printed work', arabicDef: 'عمل مكتوب أو مطبوع', example: 'I read a book every week.' },
  { id: 3, word: 'Water', type: 'noun', arabic: 'ماء', level: 'A1', definition: 'Clear liquid essential for life', arabicDef: 'سائل صافٍ ضروري للحياة', example: 'Drink water every day.' },
  { id: 4, word: 'Family', type: 'noun', arabic: 'عائلة', level: 'A1', definition: 'A group of related people', arabicDef: 'مجموعة من الأشخاص المرتبطين', example: 'My family is very important to me.' },
  { id: 5, word: 'Friend', type: 'noun', arabic: 'صديق', level: 'A1', definition: 'A person you like and trust', arabicDef: 'شخص تحبه وتثق به', example: 'She is my best friend.' },
  { id: 6, word: 'Happy', type: 'adj', arabic: 'سعيد', level: 'A1', definition: 'Feeling or showing pleasure', arabicDef: 'يشعر أو يُظهر البهجة', example: 'I am happy today.' },
  { id: 7, word: 'Big', type: 'adj', arabic: 'كبير', level: 'A1', definition: 'Large in size', arabicDef: 'كبير الحجم', example: 'That is a big dog.' },
  { id: 8, word: 'Eat', type: 'verb', arabic: 'يأكل', level: 'A1', definition: 'To put food in your mouth and swallow it', arabicDef: 'وضع الطعام في الفم وابتلاعه', example: 'I eat lunch at noon.' },
  { id: 9, word: 'Beautiful', type: 'adj', arabic: 'جميل', level: 'A2', definition: 'Very pleasing to the senses', arabicDef: 'ممتع جداً للحواس', example: 'What a beautiful sunset!' },
  { id: 10, word: 'Travel', type: 'verb', arabic: 'يسافر', level: 'A2', definition: 'To go from one place to another', arabicDef: 'الانتقال من مكان إلى آخر', example: 'I love to travel to new countries.' },
  { id: 11, word: 'Work', type: 'verb/noun', arabic: 'يعمل / عمل', level: 'A2', definition: 'To do a job; a job or task', arabicDef: 'القيام بعمل؛ وظيفة أو مهمة', example: 'I work in an office.' },
  { id: 12, word: 'Learn', type: 'verb', arabic: 'يتعلم', level: 'A2', definition: 'To gain knowledge or skills', arabicDef: 'اكتساب المعرفة أو المهارات', example: 'I want to learn English.' },
  { id: 13, word: 'Interesting', type: 'adj', arabic: 'مثير للاهتمام', level: 'A2', definition: 'Holding your attention', arabicDef: 'يستحوذ على انتباهك', example: 'This book is very interesting.' },
  { id: 14, word: 'Important', type: 'adj', arabic: 'مهم', level: 'A2', definition: 'Having great significance', arabicDef: 'ذو أهمية كبيرة', example: 'Health is very important.' },
  { id: 15, word: 'Understand', type: 'verb', arabic: 'يفهم', level: 'A2', definition: 'To know the meaning of something', arabicDef: 'معرفة معنى شيء ما', example: 'Do you understand me?' },
  { id: 16, word: 'Speak', type: 'verb', arabic: 'يتحدث', level: 'A2', definition: 'To use voice to communicate', arabicDef: 'استخدام الصوت للتواصل', example: 'She speaks three languages.' },
  { id: 17, word: 'Ambitious', type: 'adj', arabic: 'طموح', level: 'B1', definition: 'Having a strong desire to succeed', arabicDef: 'لديه رغبة قوية في النجاح', example: 'She is very ambitious and hardworking.' },
  { id: 18, word: 'Confident', type: 'adj', arabic: 'واثق من نفسه', level: 'B1', definition: 'Feeling sure about your abilities', arabicDef: 'الشعور بالتأكد من قدراتك', example: 'Be confident in yourself.' },
  { id: 19, word: 'Achieve', type: 'verb', arabic: 'يُحقق', level: 'B1', definition: 'To successfully reach a goal', arabicDef: 'الوصول إلى هدف بنجاح', example: 'You can achieve anything you want.' },
  { id: 20, word: 'Opportunity', type: 'noun', arabic: 'فرصة', level: 'B1', definition: 'A chance to do something', arabicDef: 'فرصة للقيام بشيء', example: 'Do not miss this opportunity.' },
  { id: 21, word: 'Challenge', type: 'noun', arabic: 'تحدي', level: 'B1', definition: 'Something difficult that requires effort', arabicDef: 'شيء صعب يتطلب جهداً', example: 'Learning a new language is a challenge.' },
  { id: 22, word: 'Improve', type: 'verb', arabic: 'يُحسّن', level: 'B1', definition: 'To get better at something', arabicDef: 'التحسّن في شيء ما', example: 'I want to improve my English.' },
  { id: 23, word: 'Experience', type: 'noun', arabic: 'خبرة / تجربة', level: 'B1', definition: 'Knowledge gained by doing things', arabicDef: 'المعرفة المكتسبة من الممارسة', example: 'I have five years of experience.' },
  { id: 24, word: 'Persevere', type: 'verb', arabic: 'يثابر', level: 'B1', definition: 'To continue despite difficulty', arabicDef: 'الاستمرار رغم الصعوبات', example: 'You must persevere even when things get tough.' },
  { id: 25, word: 'Resilient', type: 'adj', arabic: 'صامد / مرن', level: 'B2', definition: 'Able to recover quickly from difficulty', arabicDef: 'قادر على التعافي بسرعة من الصعوبات', example: 'Children are often very resilient.' },
  { id: 26, word: 'Collaborate', type: 'verb', arabic: 'يتعاون', level: 'B2', definition: 'To work jointly with others on a project', arabicDef: 'العمل مع الآخرين بشكل مشترك', example: 'The two teams collaborated on the research.' },
  { id: 27, word: 'Diligent', type: 'adj', arabic: 'مجتهد / دؤوب', level: 'B2', definition: 'Showing care and effort in work', arabicDef: 'يُظهر الاهتمام والجهد في عمله', example: 'A diligent student always reviews their notes.' },
  { id: 28, word: 'Significant', type: 'adj', arabic: 'هام / ذو أهمية', level: 'B2', definition: 'Important or large enough to have an effect', arabicDef: 'مهم بما يكفي لإحداث تأثير', example: 'This is a significant achievement.' },
  { id: 29, word: 'Facilitate', type: 'verb', arabic: 'يُسهّل', level: 'B2', definition: 'To make an action or process easier', arabicDef: 'جعل فعل أو عملية أسهل', example: 'The new software facilitates teamwork.' },
  { id: 30, word: 'Acknowledge', type: 'verb', arabic: 'يُقرّ / يعترف', level: 'B2', definition: 'To accept or admit something is true', arabicDef: 'قبول أو الاعتراف بصحة شيء ما', example: 'He acknowledged his mistake openly.' },
  { id: 31, word: 'Inevitable', type: 'adj', arabic: 'حتمي / لا مفر منه', level: 'B2', definition: 'Certain to happen; unavoidable', arabicDef: 'مؤكد الحدوث ولا يمكن تجنبه', example: 'Change is inevitable in life.' },
  { id: 32, word: 'Consistent', type: 'adj', arabic: 'متسق / ثابت', level: 'B2', definition: 'Always behaving in the same way', arabicDef: 'يتصرف دائماً بنفس الطريقة', example: 'Be consistent in your practice.' },
  { id: 33, word: 'Eloquent', type: 'adj', arabic: 'فصيح / بليغ', level: 'C1', definition: 'Fluent or persuasive in speaking or writing', arabicDef: 'طليق اللسان ومقنع في الكلام أو الكتابة', example: 'He gave an eloquent speech at the ceremony.' },
  { id: 34, word: 'Contemplate', type: 'verb', arabic: 'يتأمل', level: 'C1', definition: 'To think carefully about something', arabicDef: 'التفكير بعمق في شيء ما', example: 'She sat quietly to contemplate her decision.' },
  { id: 35, word: 'Profound', type: 'adj', arabic: 'عميق / بالغ', level: 'C1', definition: 'Very great or intense; having deep meaning', arabicDef: 'بالغ الأثر؛ ذو معنى عميق', example: 'Reading that book had a profound impact on me.' },
  { id: 36, word: 'Skeptical', type: 'adj', arabic: 'متشكك', level: 'C1', definition: 'Not easily convinced; having doubts', arabicDef: 'لا يقتنع بسهولة؛ لديه شكوك', example: 'He was skeptical about the new plan.' },
  { id: 37, word: 'Nuance', type: 'noun', arabic: 'فارق دقيق', level: 'C1', definition: 'A subtle difference in meaning or expression', arabicDef: 'فرق دقيق في المعنى أو التعبير', example: 'There is a nuance between "sad" and "melancholy".' },
  { id: 38, word: 'Articulate', type: 'adj/verb', arabic: 'واضح التعبير', level: 'C1', definition: 'Able to express ideas clearly', arabicDef: 'قادر على التعبير بوضوح', example: 'She is very articulate in her presentations.' },
  { id: 39, word: 'Pragmatic', type: 'adj', arabic: 'عملي / براغماتي', level: 'C1', definition: 'Dealing with things practically rather than ideally', arabicDef: 'التعامل مع الأمور بصورة عملية', example: 'We need a pragmatic approach to this problem.' },
  { id: 40, word: 'Ambiguous', type: 'adj', arabic: 'غامض / ملتبس', level: 'C1', definition: 'Open to more than one interpretation', arabicDef: 'قابل لأكثر من تفسير واحد', example: 'The instructions were ambiguous.' },
  { id: 41, word: 'Ubiquitous', type: 'adj', arabic: 'في كل مكان', level: 'C2', definition: 'Present or found everywhere', arabicDef: 'موجود أو يُوجد في كل مكان', example: 'Smartphones are ubiquitous in modern life.' },
  { id: 42, word: 'Exacerbate', type: 'verb', arabic: 'يُفاقم / يُسوّئ', level: 'C2', definition: 'To make a bad situation worse', arabicDef: 'جعل الوضع السيء أسوأ', example: 'The rain exacerbated the flooding.' },
  { id: 43, word: 'Juxtapose', type: 'verb', arabic: 'يضع جنباً إلى جنب', level: 'C2', definition: 'To place two things together for comparison', arabicDef: 'وضع شيئين معاً للمقارنة', example: 'The author juxtaposes wealth and poverty.' },
  { id: 44, word: 'Ephemeral', type: 'adj', arabic: 'عابر / زائل', level: 'C2', definition: 'Lasting for only a short time', arabicDef: 'يدوم لوقت قصير فقط', example: 'Fame is often ephemeral.' },
  { id: 45, word: 'Paradigm', type: 'noun', arabic: 'نموذج / إطار فكري', level: 'C2', definition: 'A typical example or established pattern', arabicDef: 'مثال نموذجي أو نمط راسخ', example: 'This discovery created a paradigm shift.' },
  { id: 46, word: 'Eloquence', type: 'noun', arabic: 'بلاغة / فصاحة', level: 'C2', definition: 'The ability to speak fluently and persuasively', arabicDef: 'القدرة على الكلام بطلاقة وإقناع', example: "The lawyer's eloquence won the case." },
  { id: 47, word: 'Perspicacious', type: 'adj', arabic: 'ثاقب البصيرة', level: 'C2', definition: 'Having a ready insight; shrewd', arabicDef: 'يتمتع بفهم سريع وذكاء حاد', example: 'A perspicacious observer noticed the contradiction.' },
  { id: 48, word: 'Fluent', type: 'adj', arabic: 'طليق اللسان', level: 'C2', definition: 'Able to speak a language easily and accurately', arabicDef: 'القدرة على التحدث بلغة بسهولة ودقة', example: 'She is fluent in three languages.' },
]

// ── Speech ────────────────────────────────────────────────────────────────────
function SpeakBtn({ text, size = 'md' }) {
  const [playing, setPlaying] = useState(false)
  function handleClick(e) {
    e.stopPropagation()
    setPlaying(true)
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'en-US'
    utt.rate = 0.85
    utt.pitch = 1
    const voices = window.speechSynthesis.getVoices()
    const en = voices.find(v => v.lang.startsWith('en') && v.localService) ||
               voices.find(v => v.lang.startsWith('en'))
    if (en) utt.voice = en
    utt.onend = () => setPlaying(false)
    utt.onerror = () => setPlaying(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utt)
  }
  return (
    <button className={`speak-btn speak-btn-${size} ${playing ? 'playing' : ''}`}
      onClick={handleClick} title={`نطق: ${text}`} aria-label="استمع إلى النطق">
      {playing ? '🔊' : '🔈'}
    </button>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial }
    catch { return initial }
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(val)) }, [key, val])
  return [val, setVal]
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function LangSelector() {
  const { lang, setLang } = useLang()
  const [open, setOpen] = useState(false)
  const current = LANGUAGES.find(l => l.code === lang)
  return (
    <div className="lang-selector">
      <button className="lang-btn" onClick={() => setOpen(v => !v)} title="Language">
        {current?.flag} <span className="lang-code">{current?.code?.toUpperCase()}</span>
      </button>
      {open && (
        <div className="lang-dropdown">
          {LANGUAGES.map(l => (
            <button key={l.code} className={`lang-option ${l.code === lang ? 'active' : ''}`}
              onClick={() => { setLang(l.code); setOpen(false) }}>
              <span>{l.flag}</span> <span>{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('em-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('em-theme', dark ? 'dark' : 'light')
  }, [dark])
  return (
    <button className="theme-toggle" onClick={() => setDark(d => !d)} title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}>
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

function Nav({ page, setPage, streak, user, onAuthClick, onLogout }) {
  const { t } = useLang()
  const [menuOpen, setMenuOpen] = useState(false)
  const links = [
    { id: 'home', label: t.home },
    { id: 'lessons', label: t.lessons },
    { id: 'quizzes', label: t.quizzes },
    { id: 'vocabulary', label: t.vocabulary },
    { id: 'ai', label: t.aiTutor },
    { id: 'writing', label: t.writing },
    { id: 'pricing', label: t.pricing },
    { id: 'leaderboard', label: '🏆' },
  ]
  const initials = user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase()
  return (
    <nav className="nav">
      <button className="menu-toggle" onClick={() => setMenuOpen(v => !v)} aria-label="قائمة">
        {menuOpen ? '✕' : '☰'}
      </button>
      <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
        {links.map(l => (
          <button key={l.id} className={`nav-link ${page === l.id ? 'active' : ''}`}
            onClick={() => { setPage(l.id); setMenuOpen(false) }}>{l.label}</button>
        ))}
      </div>
      <button className="nav-brand" onClick={() => setPage('home')}>
        <span>English<strong>Master</strong></span>
        <span className="nav-logo">🇬🇧</span>
      </button>
      <div className="nav-right">
        <LangSelector />
        <ThemeToggle />
        <span className="streak-badge" title={t.streak}>🔥 {streak}</span>
        {user ? (
          <div className="nav-user">
            <div className="nav-avatar" title={user.displayName || user.email}>{initials}</div>
            <button className="nav-logout" onClick={onLogout} title={t.logout}>{t.logout}</button>
          </div>
        ) : (
          <button className="nav-login-btn" onClick={onAuthClick}>{t.login}</button>
        )}
      </div>
    </nav>
  )
}

function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login') // login | register | reset
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  function errMsg(code) {
    if (code === 'auth/email-already-in-use') return 'هذا الإيميل مستخدم بالفعل'
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'الإيميل أو كلمة المرور غير صحيحة'
    if (code === 'auth/user-not-found') return 'لا يوجد حساب بهذا الإيميل'
    if (code === 'auth/weak-password') return 'كلمة المرور قصيرة جداً (6 أحرف على الأقل)'
    if (code === 'auth/invalid-email') return 'صيغة الإيميل غير صحيحة'
    if (code === 'auth/popup-closed-by-user') return ''
    return 'حدث خطأ، حاول مرة أخرى'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() })
        onSuccess(cred.user)
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        onSuccess(cred.user)
      }
    } catch (err) {
      setError(errMsg(err.code))
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setError(''); setLoading(true)
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      onSuccess(cred.user)
    } catch (err) { setError(errMsg(err.code)) } finally { setLoading(false) }
  }

  async function handleReset() {
    if (!email) { setError('أدخل الإيميل أولاً'); return }
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true); setError('')
    } catch (err) { setError(errMsg(err.code)) } finally { setLoading(false) }
  }

  return (
    <div className="auth-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <button className="auth-close" onClick={onClose}>✕</button>
        <div className="auth-logo">🇬🇧</div>
        <h2>{mode === 'login' ? 'تسجيل الدخول' : mode === 'register' ? 'إنشاء حساب' : 'استعادة كلمة المرور'}</h2>
        <p className="auth-sub">{mode === 'login' ? 'أهلاً بعودتك!' : mode === 'register' ? 'انضم وابدأ رحلتك مع الإنجليزية' : 'سنرسل لك رابط الاستعادة'}</p>

        {mode !== 'reset' && (
          <button className="auth-google-btn" onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.3 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.1-10 6.1-17.3z"/><path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.7-4.6l-7.9-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.6 2.6 10.8l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-8.1 2.3-6.3 0-11.6-3.8-13.5-9.2l-7.9 6.2C6.6 42.6 14.6 48 24 48z"/></svg>
            المتابعة بـ Google
          </button>
        )}

        {mode !== 'reset' && <div className="auth-divider"><span>أو</span></div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <input className="auth-input" type="text" placeholder="الاسم (اختياري)" value={name} onChange={e => setName(e.target.value)} dir="rtl" />
          )}
          <input className="auth-input" type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required dir="ltr" />
          {mode !== 'reset' && (
            <input className="auth-input" type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required dir="ltr" minLength={6} />
          )}
          {error && <div className="ai-error">{error}</div>}
          {resetSent && <div className="auth-success">تم إرسال رابط الاستعادة إلى بريدك ✓</div>}
          {mode === 'reset' ? (
            <button type="button" className="btn-primary auth-submit" onClick={handleReset} disabled={loading}>{loading ? '...' : 'إرسال رابط الاستعادة'}</button>
          ) : (
            <button type="submit" className="btn-primary auth-submit" disabled={loading}>{loading ? '...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}</button>
          )}
        </form>

        <div className="auth-switch">
          {mode === 'login' && (<>ليس لديك حساب؟ <button onClick={() => { setMode('register'); setError('') }}>أنشئ حساباً</button></>)}
          {mode === 'register' && (<>لديك حساب؟ <button onClick={() => { setMode('login'); setError('') }}>سجّل دخولك</button></>)}
          {mode !== 'reset' && <> · <button onClick={() => { setMode('reset'); setError('') }}>نسيت كلمة المرور؟</button></>}
          {mode === 'reset' && <button onClick={() => { setMode('login'); setError('') }}>عودة لتسجيل الدخول</button>}
        </div>
      </div>
    </div>
  )
}

// ── Home ──────────────────────────────────────────────────────────────────────
function Home({ progress, setPage }) {
  const { t } = useLang()
  const completedLessons = Object.keys(progress.lessons || {}).filter(k => progress.lessons[k]).length
  const completedQuizzes = Object.keys(progress.quizzes || {}).length
  const vocabLearned = (progress.vocab || []).length

  const stats = [
    { label: t.lessonsCompleted, value: completedLessons, total: LESSONS.length, icon: '📚' },
    { label: t.quizzesCompleted, value: completedQuizzes, total: QUIZZES.length, icon: '✅' },
    { label: t.wordsLearned, value: vocabLearned, total: VOCAB.length, icon: '📝' },
  ]

  const nextLesson = LESSONS.find(l => !progress.lessons?.[l.id])
  const nextQuiz = QUIZZES.find(q => !progress.quizzes?.[q.id])

  return (
    <div className="page home-page">
      <div className="hero">
        <div className="hero-badge">{t.heroBadge}</div>
        <h1>{t.heroTitle1}<br /><span className="accent">{t.heroTitle2}</span></h1>
        <p className="hero-sub">{t.heroSub}</p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => setPage('lessons')}>{t.startLearning}</button>
          <button className="btn-secondary" onClick={() => setPage('ai')}>{t.aiAssistant}</button>
        </div>
      </div>

      <div className="stats-row">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-number">{s.value}<span className="stat-total">/{s.total}</span></div>
            <div className="stat-label">{s.label}</div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${(s.value / s.total) * 100}%` }} /></div>
          </div>
        ))}
      </div>

      {completedLessons > 0 && (
        <button className="share-btn" onClick={() => {
          const text = `I'm learning English on EnglishMaster AI! ${completedLessons} lessons completed 📚\nhttps://englishmasterai.com`
          if (navigator.share) navigator.share({ text }).catch(() => {})
          else navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'))
        }}>📤 Share Progress</button>
      )}

      {(() => {
        const completedLessons = Object.keys(progress.lessons || {})
        const badges = LEVELS.map(lvl => {
          const levelLessons = LESSONS.filter(l => l.level === lvl.id)
          const done = levelLessons.filter(l => completedLessons.includes(String(l.id)))
          return { ...lvl, total: levelLessons.length, done: done.length, unlocked: done.length === levelLessons.length && levelLessons.length > 0 }
        })
        const anyUnlocked = badges.some(b => b.unlocked)
        return anyUnlocked ? (
          <div className="achievements-section">
            <h2>{t.achievements}</h2>
            <div className="badges-row">
              {badges.map(b => (
                <div key={b.id} className={`achievement-badge ${b.unlocked ? 'unlocked' : 'locked'}`}>
                  <span className="badge-icon">{b.unlocked ? '🏆' : '🔒'}</span>
                  <span className="badge-level">{b.id}</span>
                  <span className="badge-label">{b.label}</span>
                  <span className="badge-progress">{b.done}/{b.total}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null
      })()}

      {(() => {
        const CERT_LEVELS = { A1: 3, A2: 3, B1: 4, B2: 2, C1: 2, C2: 2 }
        const completedCerts = Object.entries(CERT_LEVELS).filter(([lvl, total]) => {
          const done = LESSONS.filter(l => l.level === lvl && progress.lessons?.[l.id]).length
          return done >= total
        }).map(([lvl]) => lvl)
        if (completedCerts.length === 0) return null

        function downloadCert(level) {
          const c = document.createElement('canvas')
          c.width = 800; c.height = 560
          const ctx = c.getContext('2d')
          ctx.fillStyle = '#f8f6ff'; ctx.fillRect(0, 0, 800, 560)
          ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 6
          ctx.strokeRect(20, 20, 760, 520)
          ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2
          ctx.strokeRect(30, 30, 740, 500)
          ctx.fillStyle = '#6d28d9'; ctx.font = 'bold 28px serif'
          ctx.textAlign = 'center'
          ctx.fillText('EnglishMaster AI', 400, 80)
          ctx.fillStyle = '#1e1b4b'; ctx.font = '18px sans-serif'
          ctx.fillText('Certificate of Achievement', 400, 120)
          ctx.fillStyle = '#6d28d9'; ctx.font = 'bold 60px serif'
          ctx.fillText(level, 400, 220)
          ctx.fillStyle = '#4c1d95'; ctx.font = '20px sans-serif'
          const levelNames = { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper Intermediate', C1: 'Advanced', C2: 'Proficient' }
          ctx.fillText(levelNames[level], 400, 260)
          ctx.fillStyle = '#374151'; ctx.font = '16px sans-serif'
          ctx.fillText(`Completed all ${CERT_LEVELS[level]} lessons at level ${level}`, 400, 320)
          ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 400, 360)
          ctx.fillStyle = '#9ca3af'; ctx.font = '13px sans-serif'
          ctx.fillText('englishmasterai.com', 400, 500)
          const link = document.createElement('a')
          link.download = `EnglishMaster-${level}-Certificate.png`
          link.href = c.toDataURL('image/png')
          link.click()
        }

        return (
          <div className="certificates-section">
            <h2>🎓 {t.achievements}</h2>
            <div className="cert-grid">
              {completedCerts.map(lvl => (
                <button key={lvl} className="cert-card" onClick={() => downloadCert(lvl)}>
                  <span className="cert-icon">🎓</span>
                  <span className="cert-level">{lvl}</span>
                  <span className="cert-download">⬇ Download</span>
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      {(nextLesson || nextQuiz) && (
        <div className="continue-section">
          <h2>{t.continueTitle}</h2>
          <div className="continue-cards">
            {nextLesson && (
              <div className="continue-card" onClick={() => setPage('lessons')}>
                <span className="continue-arrow">←</span>
                <div>
                  <div className="continue-type">{t.nextLesson}</div>
                  <div className="continue-title">{nextLesson.title}</div>
                  <div className="continue-sub">{nextLesson.englishTitle}</div>
                  <div className={`level-badge ${LEVEL_MAP[nextLesson.level]?.color}`}>{LEVEL_MAP[nextLesson.level]?.label} · {nextLesson.level}</div>
                </div>
                <span className="continue-icon">{nextLesson.icon}</span>
              </div>
            )}
            {nextQuiz && (
              <div className="continue-card" onClick={() => setPage('quizzes')}>
                <span className="continue-arrow">←</span>
                <div>
                  <div className="continue-type">{t.nextQuiz}</div>
                  <div className="continue-title">{nextQuiz.title}</div>
                </div>
                <span className="continue-icon">{nextQuiz.icon}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="features-row">
        {[
          { icon: '📚', title: 'دروس منظمة', desc: `${LESSONS.length} درساً من A1 إلى C2 — كل شيء مشروح بالعربية.` },
          { icon: '🎯', title: 'اختبارات تفاعلية', desc: `${QUIZZES.length} اختبارات متعددة الخيارات لقياس مستواك.` },
          { icon: '🔤', title: 'بنك المفردات', desc: `${VOCAB.length} كلمة إنجليزية منظمة حسب المستوى.` },
          { icon: '🤖', title: 'مساعد ذكي', desc: 'تحدث مع مساعد ذكاء اصطناعي يشرح لك بالعربية والإنجليزية.' },
        ].map(f => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Lessons ───────────────────────────────────────────────────────────────────
function LessonCard({ lesson, done, onClick }) {
  const lvl = LEVEL_MAP[lesson.level]
  return (
    <div className={`lesson-card ${done ? 'done' : ''}`} onClick={onClick}>
      <div className="lesson-card-top">
        <span className="lesson-icon">{lesson.icon}</span>
        {done && <span className="done-badge">✓</span>}
      </div>
      <div className={`level-badge ${lvl?.color}`}>{lvl?.label} · {lesson.level}</div>
      <h3 className="lesson-title">{lesson.title}</h3>
      <div className="lesson-subtitle">{lesson.englishTitle}</div>
      <div className="lesson-meta">⏱ {lesson.duration}</div>
    </div>
  )
}

function LessonDetail({ lesson, onBack, onComplete, done }) {
  const [finished, setFinished] = useState(false)
  const lvl = LEVEL_MAP[lesson.level]

  function handleComplete() {
    setFinished(true)
    onComplete(lesson.id)
  }

  return (
    <div className="page lesson-detail">
      <button className="back-btn" onClick={onBack}>→ العودة إلى الدروس</button>
      <div className="lesson-header">
        <span className="lesson-icon-lg">{lesson.icon}</span>
        <div>
          <div className={`level-badge ${lvl?.color}`}>{lvl?.label} · {lesson.level}</div>
          <h1>{lesson.title}</h1>
          <div className="lesson-english-title">{lesson.englishTitle}</div>
          <span className="lesson-meta">⏱ {lesson.duration}</span>
        </div>
      </div>
      <div className="lesson-body">
        {lesson.content.map((block, i) => {
          if (block.type === 'text') return <p key={i} className="lesson-text">{block.body}</p>
          if (block.type === 'phrase') return (
            <div key={i} className="phrase-table">
              {block.items.map((item, j) => (
                <div key={j} className="phrase-row">
                  <div className="phrase-en">
                    <SpeakBtn text={item.en} size="sm" />
                    {item.en}
                  </div>
                  <div className="phrase-ar">{item.ar}</div>
                  <div className="phrase-note">{item.note}</div>
                </div>
              ))}
            </div>
          )
          if (block.type === 'list') return (
            <ul key={i} className="lesson-list">
              {block.items.map((item, j) => <li key={j}>{item}</li>)}
            </ul>
          )
          if (block.type === 'example') return (
            <div key={i} className="lesson-example">
              <div className="example-label">{block.label}</div>
              <pre>{block.body}</pre>
            </div>
          )
          return null
        })}
      </div>
      {!done && !finished ? (
        <button className="btn-primary complete-btn" onClick={handleComplete}>✓ أكملت هذا الدرس</button>
      ) : (
        <div className="completed-msg">✅ أحسنت! لقد أكملت هذا الدرس</div>
      )}
    </div>
  )
}

function Lessons({ progress, onComplete }) {
  const [active, setActive] = useState(null)
  const [filter, setFilter] = useState('الكل')

  if (active) {
    const lesson = LESSONS.find(l => l.id === active)
    return <LessonDetail lesson={lesson} onBack={() => setActive(null)}
      onComplete={onComplete} done={progress.lessons?.[active]} />
  }

  const filtered = filter === 'الكل' ? LESSONS : LESSONS.filter(l => l.level === filter)

  return (
    <div className="page">
      <div className="page-header">
        <h1>الدروس</h1>
        <p>تعلّم الإنجليزية خطوة بخطوة بدروس منظمة من A1 إلى C2 — كل شيء مشروح بالعربية.</p>
      </div>
      <div className="filter-row">
        <button className={`filter-btn ${filter === 'الكل' ? 'active' : ''}`} onClick={() => setFilter('الكل')}>الكل</button>
        {LEVELS.map(l => (
          <button key={l.id} className={`filter-btn ${filter === l.id ? 'active' : ''}`}
            onClick={() => setFilter(l.id)}>{l.label} · {l.id}</button>
        ))}
      </div>
      <div className="cards-grid">
        {filtered.map(l => (
          <LessonCard key={l.id} lesson={l} done={progress.lessons?.[l.id]} onClick={() => setActive(l.id)} />
        ))}
      </div>
    </div>
  )
}

// ── Quizzes ───────────────────────────────────────────────────────────────────
function QuizRunner({ quiz, onBack, onFinish, prevScore }) {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])
  const [done, setDone] = useState(false)

  const q = quiz.questions[step]
  const total = quiz.questions.length

  function pick(i) {
    if (selected !== null) return
    setSelected(i)
  }

  function next() {
    const newAnswers = [...answers, selected]
    if (step + 1 < total) {
      setAnswers(newAnswers)
      setSelected(null)
      setStep(s => s + 1)
    } else {
      const score = newAnswers.filter((a, i) => a === quiz.questions[i].answer).length
      setAnswers(newAnswers)
      setDone(true)
      onFinish(quiz.id, score, total)
    }
  }

  if (done) {
    const score = answers.filter((a, i) => a === quiz.questions[i].answer).length
    const pct = Math.round((score / total) * 100)
    return (
      <div className="page quiz-result">
        <button className="back-btn" onClick={onBack}>→ العودة إلى الاختبارات</button>
        <div className="result-card">
          <div className="result-emoji">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '📖'}</div>
          <h2>انتهى الاختبار!</h2>
          <div className="score-circle">
            <span className="score-num">{score}</span>
            <span className="score-den">/{total}</span>
          </div>
          <div className="score-pct">{pct}%</div>
          <p className="result-msg">
            {pct === 100 ? '🌟 ممتاز! إجابات مثالية!' :
             pct >= 80 ? 'أحسنت! أداء رائع!' :
             pct >= 50 ? 'جيد! راجع الدرس وحاول مجدداً.' :
             'واصل المراجعة وحاول مرة أخرى!'}
          </p>
          {prevScore !== undefined && (
            <div className="prev-score">أفضل نتيجة سابقة: {prevScore}/{total}</div>
          )}
          <div className="result-review">
            {quiz.questions.map((q, i) => (
              <div key={i} className={`review-item ${answers[i] === q.answer ? 'correct' : 'wrong'}`}>
                <span className="review-icon">{answers[i] === q.answer ? '✓' : '✗'}</span>
                <div>
                  <div className="review-q">{q.q}</div>
                  {answers[i] !== q.answer && (
                    <div className="review-correct">الإجابة الصحيحة: {q.options[q.answer]}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={onBack}>العودة إلى الاختبارات</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page quiz-runner">
      <button className="back-btn" onClick={onBack}>→ العودة إلى الاختبارات</button>
      <div className="quiz-progress-row">
        <span>{step + 1} / {total}</span>
        <span>{quiz.title}</span>
      </div>
      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${((step) / total) * 100}%` }} />
      </div>
      <div className="quiz-card">
        <div className="question-num">السؤال {step + 1}</div>
        <h2 className="question-text">{q.q}</h2>
        <div className="options">
          {q.options.map((opt, i) => {
            let cls = 'option'
            if (selected !== null) {
              if (i === q.answer) cls += ' correct'
              else if (i === selected) cls += ' wrong'
            }
            return (
              <button key={i} className={cls} onClick={() => pick(i)}>
                <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                {opt}
              </button>
            )
          })}
        </div>
        {selected !== null && (
          <button className="btn-primary next-btn" onClick={next}>
            {step + 1 < total ? 'السؤال التالي ←' : 'عرض النتائج'}
          </button>
        )}
      </div>
    </div>
  )
}

function Quizzes({ progress, onFinish }) {
  const [active, setActive] = useState(null)
  const [filter, setFilter] = useState('الكل')

  if (active !== null) {
    const quiz = QUIZZES.find(q => q.id === active)
    const prev = progress.quizzes?.[active]
    return <QuizRunner quiz={quiz} onBack={() => setActive(null)}
      onFinish={onFinish} prevScore={prev} />
  }

  const filtered = filter === 'الكل' ? QUIZZES : QUIZZES.filter(q => q.level === filter)

  return (
    <div className="page">
      <div className="page-header">
        <h1>الاختبارات</h1>
        <p>اختبر معلوماتك بأسئلة متعددة الخيارات بعد كل درس.</p>
      </div>
      <div className="filter-row">
        <button className={`filter-btn ${filter === 'الكل' ? 'active' : ''}`} onClick={() => setFilter('الكل')}>الكل</button>
        {LEVELS.map(l => (
          <button key={l.id} className={`filter-btn ${filter === l.id ? 'active' : ''}`}
            onClick={() => setFilter(l.id)}>{l.label} · {l.id}</button>
        ))}
      </div>
      <div className="cards-grid">
        {filtered.map(q => {
          const score = progress.quizzes?.[q.id]
          const pct = score !== undefined ? Math.round((score / q.questions.length) * 100) : null
          const lvl = LEVEL_MAP[q.level]
          return (
            <div key={q.id} className="quiz-card-list" onClick={() => setActive(q.id)}>
              <div className="quiz-card-top">
                <span className="lesson-icon">{q.icon}</span>
                {pct !== null && <span className={`score-badge ${pct >= 80 ? 'good' : pct >= 50 ? 'ok' : 'low'}`}>{pct}%</span>}
              </div>
              <div className={`level-badge ${lvl?.color}`}>{lvl?.label} · {q.level}</div>
              <h3>{q.title}</h3>
              <div className="lesson-meta">{q.questions.length} أسئلة</div>
              <button className="btn-quiz">{pct !== null ? 'أعد الاختبار' : 'ابدأ الاختبار'}</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Vocabulary ────────────────────────────────────────────────────────────────
function VocabCard({ word, learned, onLearn }) {
  const [flipped, setFlipped] = useState(false)
  const lvl = LEVEL_MAP[word.level]
  return (
    <div className={`vocab-card ${flipped ? 'flipped' : ''} ${learned ? 'learned' : ''}`}
      onClick={() => setFlipped(v => !v)}>
      <div className="vocab-front">
        <div className={`level-badge ${lvl?.color}`} style={{ alignSelf: 'flex-start', fontSize: '0.7rem', marginBottom: 4 }}>{word.level}</div>
        <div className="vocab-word">{word.word}</div>
        <SpeakBtn text={word.word} size="lg" />
        <div className="vocab-type">{word.type}</div>
        <div className="vocab-arabic-front">{word.arabic}</div>
        <div className="flip-hint">اضغط لمعرفة المعنى</div>
      </div>
      <div className="vocab-back">
        <div className="vocab-back-header">
          <div className="vocab-arabic">{word.arabic}</div>
          <SpeakBtn text={word.word} size="sm" />
        </div>
        <div className="vocab-def">{word.definition}</div>
        <div className="vocab-arabic-def">{word.arabicDef}</div>
        <div className="vocab-example">"{word.example}"</div>
        <button className={`btn-learn ${learned ? 'learned' : ''}`}
          onClick={e => { e.stopPropagation(); onLearn(word.id) }}>
          {learned ? '✓ محفوظة' : 'حفظ الكلمة'}
        </button>
      </div>
    </div>
  )
}

function Vocabulary({ progress, onLearn }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('الكل')
  const learned = progress.vocab || []

  const filtered = VOCAB
    .filter(w => levelFilter === 'الكل' ? true : w.level === levelFilter)
    .filter(w => filter === 'all' ? true : filter === 'learned' ? learned.includes(w.id) : !learned.includes(w.id))
    .filter(w =>
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.arabic.includes(search) ||
      w.definition.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="page">
      <div className="page-header">
        <h1>بنك المفردات</h1>
        <p>اضغط على البطاقة لمعرفة المعنى. احفظ الكلمات لتتبع تقدمك.</p>
      </div>
      <div className="vocab-controls">
        <input className="vocab-search" placeholder="ابحث عن كلمة…" value={search}
          onChange={e => setSearch(e.target.value)} />
        <div className="filter-row">
          <button className={`filter-btn ${levelFilter === 'الكل' ? 'active' : ''}`} onClick={() => setLevelFilter('الكل')}>كل المستويات</button>
          {LEVELS.map(l => (
            <button key={l.id} className={`filter-btn ${levelFilter === l.id ? 'active' : ''}`}
              onClick={() => setLevelFilter(l.id)}>{l.id}</button>
          ))}
        </div>
        <div className="filter-row">
          {[['all', 'كل الكلمات'], ['new', 'لم تُحفظ'], ['learned', 'محفوظة']].map(([v, l]) => (
            <button key={v} className={`filter-btn ${filter === v ? 'active' : ''}`}
              onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="vocab-stats">
        <span>📝 {learned.length} / {VOCAB.length} كلمة محفوظة</span>
        <div className="progress-bar wide"><div className="progress-fill" style={{ width: `${(learned.length / VOCAB.length) * 100}%` }} /></div>
      </div>
      <div className="vocab-grid">
        {filtered.map(w => (
          <VocabCard key={w.id} word={w} learned={learned.includes(w.id)} onLearn={onLearn} />
        ))}
        {filtered.length === 0 && <p className="empty">لا توجد كلمات مطابقة لبحثك.</p>}
      </div>
    </div>
  )
}

// ── AI Tutor ──────────────────────────────────────────────────────────────────

function formatAIText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br/>')
}

function trackStat(type) {
  const today = new Date().toISOString().slice(0, 10)
  const raw = localStorage.getItem('em-admin-stats')
  const s = raw ? JSON.parse(raw) : { total: 0, chat: 0, write: 0, errors: 0, daily: {} }
  s.total = (s.total || 0) + 1
  s[type] = (s[type] || 0) + 1
  s.daily[today] = (s.daily[today] || 0) + 1
  localStorage.setItem('em-admin-stats', JSON.stringify(s))
}

function PricingPage({ user, onAuthClick, subscription, trial }) {
  const { t } = useLang()
  const [loading, setLoading] = useState(null)

  async function handleCheckout(plan) {
    if (!user) { onAuthClick(); return }
    setLoading(plan)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, email: user.email, plan }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error(data.error)
    } catch { alert(t.genericError) }
    finally { setLoading(null) }
  }

  return (
    <div className="page pricing-page">
      <div className="page-header">
        <h1>{t.pricingTitle}</h1>
        <p>{t.pricingSub}</p>
      </div>

      {trial?.active && (
        <div className="trial-banner">
          <span className="trial-icon">🎉</span>
          <div>
            <strong>{t.trialBanner}</strong>
            <p>{t.trialDays(trial.daysLeft)}</p>
          </div>
        </div>
      )}

      {subscription?.status === 'active' && (
        <div className="trial-banner" style={{ borderColor: 'var(--green)' }}>
          <span className="trial-icon">✅</span>
          <div>
            <strong>{t.activeSub}</strong>
            <p>{t.activeSubDesc}</p>
          </div>
        </div>
      )}

      <div className="pricing-cards">
        <div className="pricing-card">
          <div className="pricing-badge">{t.monthly}</div>
          <div className="pricing-price">
            <span className="pricing-amount">$4.99</span>
            <span className="pricing-period">{t.perMonth}</span>
          </div>
          <ul className="pricing-features">
            <li>✓ {t.feature1}</li>
            <li>✓ {t.feature2}</li>
            <li>✓ {t.feature3}</li>
            <li>✓ {t.feature4}</li>
            <li>✓ {t.feature5}</li>
            <li>✓ {t.feature6}</li>
          </ul>
          <button className="btn-primary pricing-btn" onClick={() => handleCheckout('monthly')}
            disabled={loading || subscription?.status === 'active'}>
            {loading === 'monthly' ? '...' : subscription?.status === 'active' ? t.subscribed : t.subscribeNow}
          </button>
        </div>

        <div className="pricing-card pricing-card-featured">
          <div className="pricing-popular">{t.bestValue}</div>
          <div className="pricing-badge">{t.yearly}</div>
          <div className="pricing-price">
            <span className="pricing-amount">$39.99</span>
            <span className="pricing-period">{t.perYear}</span>
          </div>
          <div className="pricing-save">{t.save33}</div>
          <ul className="pricing-features">
            <li>✓ {t.feature7}</li>
            <li>✓ {t.feature8}</li>
            <li>✓ {t.feature9}</li>
          </ul>
          <button className="btn-primary pricing-btn" onClick={() => handleCheckout('yearly')}
            disabled={loading || subscription?.status === 'active'}>
            {loading === 'yearly' ? '...' : subscription?.status === 'active' ? t.subscribed : t.subscribeNow}
          </button>
        </div>
      </div>

      <div className="pricing-methods">
        <p>{t.paymentMethods}</p>
        <div className="payment-icons">
          <span>💳 Visa</span>
          <span>💳 Mastercard</span>
          <span>🍎 Apple Pay</span>
          <span>📱 Google Pay</span>
        </div>
      </div>
    </div>
  )
}

function Leaderboard({ currentUid }) {
  const { t } = useLang()
  const [board, setBoard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLeaderboard().then(setBoard).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="page leaderboard-page">
      <div className="page-header">
        <h1>🏆 Leaderboard</h1>
        <p>Top learners on EnglishMaster</p>
      </div>
      {loading ? <div className="loading-spinner">...</div> : board.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No scores yet. Complete lessons to appear here!</p>
      ) : (
        <div className="leaderboard-list">
          {board.map((entry, i) => (
            <div key={entry.uid} className={`lb-row ${entry.uid === currentUid ? 'lb-me' : ''}`}>
              <span className="lb-rank">{medals[i] || `#${i + 1}`}</span>
              <span className="lb-name">{entry.displayName || 'Learner'}</span>
              <span className="lb-stats">📚{entry.lessonsCount} · 📝{entry.vocabCount} · 🔥{entry.streak || 0}</span>
              <span className="lb-score">{entry.score} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminDashboard() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [health, setHealth] = useState(null)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, chat: 0, write: 0, errors: 0, daily: {} })

  function loadStats() {
    const raw = localStorage.getItem('em-admin-stats')
    if (raw) setStats(JSON.parse(raw))
  }

  async function login() {
    setLoading(true)
    setError('')
    try {
      const [h, i] = await Promise.all([
        fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, action: 'health' }) }).then(r => r.json()),
        fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, action: 'info' }) }).then(r => r.json()),
      ])
      if (h.error === 'كلمة المرور غير صحيحة') { setError('كلمة المرور غير صحيحة'); return }
      setHealth(h)
      setInfo(i)
      setAuthed(true)
      loadStats()
    } catch { setError('خطأ في الاتصال') } finally { setLoading(false) }
  }

  async function refresh() {
    setLoading(true)
    try {
      const h = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, action: 'health' }) }).then(r => r.json())
      setHealth(h)
      loadStats()
    } catch {} finally { setLoading(false) }
  }

  function clearStats() {
    if (confirm('هل تريد مسح جميع الإحصائيات؟')) {
      localStorage.removeItem('em-admin-stats')
      setStats({ total: 0, chat: 0, write: 0, errors: 0, daily: {} })
    }
  }

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().slice(0, 10)
    return { day: d.toLocaleDateString('ar-SA', { weekday: 'short' }), count: stats.daily?.[key] || 0 }
  })
  const maxDay = Math.max(...last7.map(d => d.count), 1)
  const estCost = ((stats.total || 0) * 0.003).toFixed(3)

  if (!authed) {
    return (
      <div className="page" style={{ maxWidth: 420, margin: '0 auto' }}>
        <div className="ai-settings-card">
          <div className="ai-settings-icon">🔐</div>
          <h2>لوحة الإدارة</h2>
          <p className="ai-settings-desc">أدخل كلمة مرور المدير للدخول</p>
          <input className="api-key-input" type="password" placeholder="كلمة المرور..."
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()} dir="ltr" />
          {error && <div className="ai-error">{error}</div>}
          <button className="btn-primary" onClick={login} disabled={loading} style={{ width: '100%', marginTop: 12 }}>
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page admin-page">
      <div className="admin-header">
        <div>
          <h1>📊 لوحة الإدارة</h1>
          <p>مرحباً بك في لوحة تحكم EnglishMaster AI</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={refresh} disabled={loading}>
          {loading ? '...' : '🔄 تحديث'}
        </button>
      </div>

      <div className="admin-status-row">
        <div className={`status-badge ${health?.status === 'ok' ? 'status-ok' : 'status-err'}`}>
          {health?.status === 'ok' ? '✅ Anthropic API تعمل' : '❌ مشكلة في API'}
        </div>
        {info && <div className="status-badge status-info">🌍 {info.region}</div>}
        {info && <div className="status-badge status-info">🔑 {info.env}</div>}
      </div>

      <div className="admin-cards">
        <div className="admin-card">
          <div className="admin-card-value">{stats.total || 0}</div>
          <div className="admin-card-label">إجمالي طلبات AI</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{stats.chat || 0}</div>
          <div className="admin-card-label">محادثات المساعد</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-value">{stats.write || 0}</div>
          <div className="admin-card-label">طلبات الكتابة</div>
        </div>
        <div className="admin-card admin-card-cost">
          <div className="admin-card-value">${estCost}</div>
          <div className="admin-card-label">تكلفة تقديرية</div>
        </div>
      </div>

      <div className="admin-chart-card">
        <div className="admin-section-title">النشاط - آخر ٧ أيام</div>
        <div className="admin-bar-chart">
          {last7.map((d, i) => (
            <div key={i} className="admin-bar-col">
              <div className="admin-bar-wrap">
                <div className="admin-bar" style={{ height: `${Math.round((d.count / maxDay) * 100)}%` }}>
                  {d.count > 0 && <span className="admin-bar-val">{d.count}</span>}
                </div>
              </div>
              <div className="admin-bar-label">{d.day}</div>
            </div>
          ))}
        </div>
      </div>

      {info && (
        <div className="admin-info-card">
          <div className="admin-section-title">معلومات النظام</div>
          <div className="admin-info-row"><span>Node.js</span><span dir="ltr">{info.node}</span></div>
          <div className="admin-info-row"><span>الخادم</span><span dir="ltr">{info.deployment}</span></div>
          <div className="admin-info-row"><span>الموقع</span><span>englishmasterai.com</span></div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button className="btn-secondary btn-sm" onClick={clearStats} style={{ color: 'var(--danger, #e24b4a)' }}>
          🗑️ مسح الإحصائيات
        </button>
      </div>
    </div>
  )
}

function PrivacyPolicy() {
  return (
    <div className="page legal-page">
      <div className="legal-header">
        <h1>سياسة الخصوصية</h1>
        <p>آخر تحديث: يونيو ٢٠٢٥</p>
      </div>
      <div className="legal-content">
        <section>
          <h2>١. مقدمة</h2>
          <p>مرحباً بك في EnglishMaster AI (<strong>englishmasterai.com</strong>). نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح هذه السياسة كيفية جمع معلوماتك واستخدامها وحمايتها.</p>
        </section>
        <section>
          <h2>٢. المعلومات التي نجمعها</h2>
          <p><strong>معلومات يقدمها المستخدم تلقائياً:</strong></p>
          <ul>
            <li>الرسائل والنصوص التي تكتبها في المساعد الذكي ومساعد الكتابة</li>
            <li>الملفات والصور التي ترفعها للتحليل</li>
          </ul>
          <p><strong>معلومات تُجمع تلقائياً:</strong></p>
          <ul>
            <li>بيانات تقدمك في الدروس والاختبارات (مخزنة محلياً في متصفحك فقط)</li>
            <li>بيانات الاستخدام الأساسية (عدد الزيارات، الصفحات المُشاهدة)</li>
          </ul>
        </section>
        <section>
          <h2>٣. كيف نستخدم معلوماتك</h2>
          <ul>
            <li>تقديم خدمة المساعد الذكي عبر Anthropic Claude API</li>
            <li>تحسين تجربة التعلم وتخصيص المحتوى</li>
            <li>تحليل الأداء العام للمنصة</li>
          </ul>
        </section>
        <section>
          <h2>٤. مشاركة البيانات مع أطراف ثالثة</h2>
          <p>نشارك بعض البيانات مع الأطراف التالية فقط:</p>
          <ul>
            <li><strong>Anthropic:</strong> يتم إرسال الرسائل التي تكتبها إلى Anthropic Claude API لمعالجتها وتوليد الردود. تخضع هذه البيانات لـ <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">سياسة خصوصية Anthropic</a>.</li>
            <li><strong>Vercel:</strong> نستضيف موقعنا على Vercel. راجع <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">سياسة خصوصية Vercel</a>.</li>
          </ul>
          <p>لا نبيع بياناتك الشخصية لأي طرف ثالث.</p>
        </section>
        <section>
          <h2>٥. تخزين البيانات</h2>
          <p>بيانات تقدمك في الدروس والمفردات مخزنة محلياً في متصفحك (localStorage) فقط، ولا ترسل إلى خوادمنا. يمكنك حذفها في أي وقت بمسح بيانات المتصفح.</p>
        </section>
        <section>
          <h2>٦. الأطفال</h2>
          <p>خدمتنا موجهة للأشخاص الذين تجاوزوا ١٣ عاماً. إذا كنت تعلم أن طفلاً دون ١٣ سنة يستخدم المنصة، يرجى التواصل معنا.</p>
        </section>
        <section>
          <h2>٧. حقوقك</h2>
          <ul>
            <li>حق الوصول إلى بياناتك الشخصية</li>
            <li>حق تصحيح البيانات غير الدقيقة</li>
            <li>حق حذف بياناتك</li>
            <li>حق الاعتراض على المعالجة</li>
          </ul>
        </section>
        <section>
          <h2>٨. التواصل معنا</h2>
          <p>لأي استفسار حول سياسة الخصوصية، تواصل معنا عبر البريد الإلكتروني: <strong>tinaamira8@gmail.com</strong></p>
        </section>
      </div>
    </div>
  )
}

function TermsOfService() {
  return (
    <div className="page legal-page">
      <div className="legal-header">
        <h1>شروط الاستخدام</h1>
        <p>آخر تحديث: يونيو ٢٠٢٥</p>
      </div>
      <div className="legal-content">
        <section>
          <h2>١. القبول بالشروط</h2>
          <p>باستخدامك لموقع EnglishMaster AI (<strong>englishmasterai.com</strong>)، فإنك توافق على الالتزام بهذه الشروط. إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام الموقع.</p>
        </section>
        <section>
          <h2>٢. وصف الخدمة</h2>
          <p>EnglishMaster AI منصة تعليمية تقدم:</p>
          <ul>
            <li>دروساً تفاعلية لتعلم اللغة الإنجليزية</li>
            <li>اختبارات ومفردات تعليمية</li>
            <li>مساعد ذكي مدعوم بالذكاء الاصطناعي للإجابة على أسئلة اللغة</li>
            <li>أداة لتحسين الكتابة الإنجليزية</li>
          </ul>
        </section>
        <section>
          <h2>٣. الاستخدام المقبول</h2>
          <p>يوافق المستخدم على:</p>
          <ul>
            <li>استخدام المنصة للأغراض التعليمية المشروعة فقط</li>
            <li>عدم محاولة اختراق أو إساءة استخدام الخدمة</li>
            <li>عدم إرسال محتوى مسيء أو غير قانوني</li>
            <li>عدم استخدام المنصة لأغراض تجارية دون إذن مسبق</li>
          </ul>
        </section>
        <section>
          <h2>٤. الملكية الفكرية</h2>
          <p>جميع محتويات الموقع، بما في ذلك النصوص والتصاميم والشعار، مملوكة لـ EnglishMaster AI. لا يحق نسخ أو توزيع أي محتوى دون إذن كتابي مسبق.</p>
        </section>
        <section>
          <h2>٥. إخلاء المسؤولية</h2>
          <p>تُقدَّم الخدمة "كما هي" دون ضمانات من أي نوع. لا نضمن دقة 100% لردود المساعد الذكي، إذ تعتمد على نماذج الذكاء الاصطناعي التي قد تحتوي على أخطاء. يُنصح دائماً بمراجعة المعلومات مع مصادر موثوقة.</p>
        </section>
        <section>
          <h2>٦. حدود المسؤولية</h2>
          <p>لن تكون EnglishMaster AI مسؤولة عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام الخدمة أو عدم القدرة على الوصول إليها.</p>
        </section>
        <section>
          <h2>٧. التعديلات على الشروط</h2>
          <p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين بأي تغييرات جوهرية عبر الموقع. الاستمرار في استخدام الخدمة بعد التعديل يعني قبولك للشروط الجديدة.</p>
        </section>
        <section>
          <h2>٨. القانون المطبق</h2>
          <p>تخضع هذه الشروط للقوانين المعمول بها. أي نزاع يُحل بالتراضي أولاً، وإن تعذر ذلك، يُلجأ إلى الجهات القانونية المختصة.</p>
        </section>
        <section>
          <h2>٩. التواصل معنا</h2>
          <p>لأي استفسار حول شروط الاستخدام: <strong>tinaamira8@gmail.com</strong></p>
        </section>
      </div>
    </div>
  )
}

function AITutor() {
  const { t, lang } = useLang()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMsg = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })), lang }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }])
      trackStat('chat')
    } catch {
      setError(t.connectionError)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const quickPrompts = [
    'علّمني كيف أقدم نفسي بالإنجليزية',
    'ما الفرق بين "make" و "do"؟',
    'كيف أستخدم المضارع التام؟',
    'أعطني جملاً مفيدة في المطار',
    'صحح جملتي: "I am go to school yesterday"',
    'كيف أعبر عن الوقت بالإنجليزية؟',
  ]

  return (
    <div className="page ai-page">
      <div className="ai-header">
        <div>
          <h1>🤖 {t.aiTitle}</h1>
          <p>{t.aiSub}</p>
        </div>
      </div>

      {messages.length === 0 && (
        <div className="ai-welcome">
          <div className="ai-welcome-icon">🤖</div>
          <h3>{t.aiWelcome}</h3>
          <p>يمكنني مساعدتك في قواعد اللغة، المفردات، النطق، وكل ما يخص تعلم الإنجليزية — بشرح عربي كامل.</p>
          <div className="quick-prompts">
            <p className="quick-prompts-label">أسئلة مقترحة:</p>
            <div className="quick-prompts-grid">
              {quickPrompts.map((p, i) => (
                <button key={i} className="quick-prompt-btn" onClick={() => setInput(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="ai-messages">
        {messages.map((m, i) => (
          <div key={i} className={`ai-message ${m.role}`}>
            <div className="ai-message-avatar">{m.role === 'user' ? '👤' : '🤖'}</div>
            <div className="ai-message-content">
              {m.role === 'assistant'
                ? <div className="ai-response-text" dangerouslySetInnerHTML={{ __html: '<p>' + formatAIText(m.content) + '</p>' }} />
                : <p>{m.content}</p>
              }
            </div>
          </div>
        ))}
        {loading && (
          <div className="ai-message assistant">
            <div className="ai-message-avatar">🤖</div>
            <div className="ai-message-content">
              <div className="ai-typing"><span></span><span></span><span></span></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className="ai-error" style={{ margin: '8px 0' }}>{error}</div>}

      <div className="ai-input-row">
        <textarea
          className="ai-input"
          placeholder="اكتب سؤالك هنا... مثال: كيف أقول 'أنا جائع' بالإنجليزية؟"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
        />
        <button className="ai-send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? '⏳' : '↑'}
        </button>
      </div>
      <p className="ai-hint">اضغط Enter للإرسال · Shift+Enter لسطر جديد</p>
    </div>
  )
}

// ── Writing Assistant ─────────────────────────────────────────────────────────
const TONES = [
  { id: 'friendly',     label: 'ودّي',     emoji: '😊', desc: 'Friendly' },
  { id: 'casual',       label: 'غير رسمي', emoji: '😎', desc: 'Casual' },
  { id: 'polite',       label: 'مهذب',     emoji: '🙏', desc: 'Polite' },
  { id: 'professional', label: 'مهني',     emoji: '💼', desc: 'Professional' },
]

const WRITING_ACTIONS = [
  { id: 'fix',      label: 'تصحيح الأخطاء',    emoji: '✏️', prompt: (text) => `Please fix all grammar, spelling, and punctuation errors in the following English text. Show the corrected version clearly, then list the specific mistakes you fixed with a brief Arabic explanation for each.\n\nText:\n${text}` },
  { id: 'explain',  label: 'شرح وتحليل',        emoji: '🔍', prompt: (text) => `Analyze the following English text. Explain its structure, grammar points used, vocabulary level, and any interesting language features. Provide your analysis in both English and Arabic.\n\nText:\n${text}` },
  { id: 'suggest',  label: 'اقتراحات للتحسين',  emoji: '💡', prompt: (text) => `Please provide 3-5 specific suggestions to improve the following English text in terms of vocabulary, sentence structure, clarity, and flow. Show improved versions of key sentences. Explain each suggestion in Arabic.\n\nText:\n${text}` },
]

function buildRewritePrompt(text, tone) {
  const toneDesc = {
    friendly:     'friendly and warm, like writing to a good friend',
    casual:       'casual and informal, using everyday conversational language',
    polite:       'polite and respectful, appropriate for formal social situations',
    professional: 'professional and formal, suitable for business or academic contexts',
  }
  return `Rewrite the following English text in a ${toneDesc[tone]} tone.
Show the rewritten version first, then briefly explain in Arabic what changes you made and why.

Original text:
${text}`
}

function WritingAssistant() {
  const { lang } = useLang()
  const [text, setText] = useState('')
  const [question, setQuestion] = useState('')
  const [selectedTone, setSelectedTone] = useState('professional')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeAction, setActiveAction] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const fileInputRef = useRef(null)
  const resultRef = useRef(null)

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [result])

  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')
    if (!isImage && !isText) { setError('يُدعم رفع صور (JPG, PNG, GIF, WebP) أو ملفات نصية (TXT, MD) فقط.'); return }
    setError('')
    const reader = new FileReader()
    if (isImage) {
      reader.onload = (ev) => {
        const dataUrl = ev.target.result
        const base64 = dataUrl.split(',')[1]
        setUploadedFile({ name: file.name, type: file.type, isImage: true, base64, preview: dataUrl })
      }
      reader.readAsDataURL(file)
    } else {
      reader.onload = (ev) => setUploadedFile({ name: file.name, type: file.type, isImage: false, textContent: ev.target.result })
      reader.readAsText(file)
    }
  }

  function removeFile() {
    setUploadedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function runAction(actionId, customPrompt = null) {
    const hasText = text.trim()
    const hasFile = uploadedFile
    const hasQuestion = question.trim()
    if (!hasText && !hasFile && !actionId) return

    setActiveAction(actionId)
    setLoading(true)
    setResult(null)
    setError('')

    try {
      let messageContent = []

      if (uploadedFile?.isImage) {
        messageContent.push({
          type: 'image',
          source: { type: 'base64', media_type: uploadedFile.type, data: uploadedFile.base64 },
        })
        const imgInstruction = customPrompt
          ? customPrompt
          : hasQuestion
            ? `Please analyze this image and answer the following question: ${question}\n\nAlso explain the text content visible in the image if any. Respond in both English and Arabic.`
            : `Please analyze this image. If it contains English text, analyze it for grammar, vocabulary, and writing quality. Describe what you see and provide any relevant English learning insights. Respond in both English and Arabic.`
        messageContent.push({ type: 'text', text: imgInstruction })
      } else {
        const sourceText = uploadedFile?.isImage === false
          ? (uploadedFile.textContent + (hasText ? '\n\n' + text.trim() : ''))
          : (hasText ? text.trim() : '')

        let prompt
        if (customPrompt) {
          prompt = customPrompt
        } else if (actionId === 'rewrite') {
          prompt = buildRewritePrompt(sourceText, selectedTone)
        } else if (actionId && WRITING_ACTIONS.find(a => a.id === actionId)) {
          prompt = WRITING_ACTIONS.find(a => a.id === actionId).prompt(sourceText)
        } else if (hasQuestion) {
          prompt = `Regarding the following English text, please answer this question: ${question}\n\nText:\n${sourceText}\n\nRespond in both English and Arabic.`
        } else {
          prompt = WRITING_ACTIONS[0].prompt(sourceText)
        }
        messageContent.push({ type: 'text', text: prompt })
      }

      const res = await fetch('/api/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageContent, lang }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `${res.status}`)
      setResult(data.text)
      trackStat('write')
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('429')) setError('تم تجاوز حد الاستخدام. حاول بعد قليل.')
      else setError(msg || 'خطأ في الاتصال. حاول مرة أخرى.')
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }

  const canRun = (text.trim() || uploadedFile) && !loading

  return (
    <div className="page writing-page">
      <div className="writing-header">
        <div>
          <h1>✍️ مساعد الكتابة</h1>
          <p>اكتب نصاً أو ارفع ملفاً أو صورة، ثم اختر ما تريد — تصحيح، تحليل، أو إعادة كتابة بأسلوب مختلف</p>
        </div>
      </div>

      <div className="writing-layout">
        {/* ── Input panel ── */}
        <div className="writing-input-panel">
          <div className="writing-section-label">📝 النص الإنجليزي</div>
          <textarea
            className="writing-textarea"
            placeholder="اكتب النص الإنجليزي هنا...&#10;مثال: I have went to the store yesterday and buyed some foods."
            value={text}
            onChange={e => setText(e.target.value)}
            rows={8}
            dir="ltr"
          />
          <div className="writing-char-count">{text.length} حرف</div>

          {/* File upload */}
          <div className="writing-section-label" style={{ marginTop: 16 }}>📎 رفع ملف أو صورة (اختياري)</div>
          {uploadedFile ? (
            <div className="file-preview">
              {uploadedFile.isImage
                ? <img src={uploadedFile.preview} alt="uploaded" className="file-preview-img" />
                : <div className="file-preview-text">📄 {uploadedFile.name}</div>
              }
              <button className="file-remove-btn" onClick={removeFile}>✕ إزالة</button>
            </div>
          ) : (
            <label className="file-upload-label">
              <input ref={fileInputRef} type="file" accept="image/*,.txt,.md" onChange={handleFileUpload} style={{ display: 'none' }} />
              <span className="file-upload-btn">📁 اختر صورة أو ملف نصي</span>
              <span className="file-upload-hint">JPG, PNG, GIF, WebP, TXT, MD</span>
            </label>
          )}

          {/* Optional question */}
          <div className="writing-section-label" style={{ marginTop: 16 }}>❓ سؤال محدد (اختياري)</div>
          <input
            className="writing-question-input"
            placeholder="مثال: ما الأسلوب الأنسب لهذا النص؟ أو: هل هناك أخطاء في الأزمنة؟"
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
        </div>

        {/* ── Actions panel ── */}
        <div className="writing-actions-panel">
          {/* Quick actions */}
          <div className="writing-section-label">⚡ إجراءات سريعة</div>
          <div className="writing-action-btns">
            {WRITING_ACTIONS.map(a => (
              <button
                key={a.id}
                className={`writing-action-btn ${activeAction === a.id && loading ? 'loading' : ''}`}
                onClick={() => runAction(a.id)}
                disabled={!canRun}
              >
                <span className="wab-emoji">{a.emoji}</span>
                <span className="wab-label">{a.label}</span>
                {activeAction === a.id && loading && <span className="wab-spinner">⏳</span>}
              </button>
            ))}
          </div>

          {/* Ask question */}
          <button
            className={`writing-action-btn ask-btn ${activeAction === 'ask' && loading ? 'loading' : ''}`}
            onClick={() => runAction('ask')}
            disabled={!canRun || !question.trim()}
            style={{ marginTop: 8, width: '100%' }}
          >
            <span className="wab-emoji">🗣️</span>
            <span className="wab-label">اسأل سؤالك المحدد</span>
            {activeAction === 'ask' && loading && <span className="wab-spinner">⏳</span>}
          </button>

          {/* Rewrite tones */}
          <div className="writing-section-label" style={{ marginTop: 24 }}>🎨 إعادة الكتابة بأسلوب مختلف</div>
          <div className="tone-grid">
            {TONES.map(t => (
              <button
                key={t.id}
                className={`tone-btn ${selectedTone === t.id ? 'selected' : ''}`}
                onClick={() => setSelectedTone(t.id)}
              >
                <span className="tone-emoji">{t.emoji}</span>
                <span className="tone-label">{t.label}</span>
                <span className="tone-desc">{t.desc}</span>
              </button>
            ))}
          </div>
          <button
            className={`btn-primary writing-rewrite-btn ${activeAction === 'rewrite' && loading ? 'loading' : ''}`}
            onClick={() => runAction('rewrite')}
            disabled={!canRun}
          >
            {activeAction === 'rewrite' && loading ? '⏳ جاري الكتابة...' : `✨ أعد الكتابة بأسلوب ${TONES.find(t => t.id === selectedTone)?.label}`}
          </button>
        </div>
      </div>

      {/* ── Result ── */}
      {error && <div className="ai-error" style={{ marginTop: 16 }}>{error}</div>}

      {loading && !result && (
        <div className="writing-loading">
          <div className="ai-typing"><span></span><span></span><span></span></div>
          <p>جاري التحليل...</p>
        </div>
      )}

      {result && (
        <div className="writing-result" ref={resultRef}>
          <div className="writing-result-header">
            <span>📋 النتيجة</span>
            <button className="writing-copy-btn" onClick={() => navigator.clipboard.writeText(result)}>📋 نسخ</button>
          </div>
          <div className="writing-result-body ai-response-text"
            dangerouslySetInnerHTML={{ __html: '<p>' + formatAIText(result) + '</p>' }} />
        </div>
      )}
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('home')
  const [progress, setProgress] = useLocalStorage('em-progress', { lessons: {}, quizzes: {}, vocab: [] })
  const [streak, setStreak] = useLocalStorage('em-streak', 0)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [trial, setTrial] = useState({ active: false, daysLeft: 0 })
  const [installPrompt, setInstallPrompt] = useState(null)
  const [lang, setLang] = useLocalStorage('em-lang', 'ar')
  const t = getTranslation(lang)
  const syncTimer = useRef(null)

  useEffect(() => {
    const dir = LANGUAGES.find(l => l.code === lang)?.dir || 'rtl'
    document.documentElement.dir = dir
    document.documentElement.lang = lang
    document.body.style.direction = dir
  }, [lang])

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    const today = new Date().toDateString()
    const last = localStorage.getItem('em-last-day')
    if (last !== today) {
      localStorage.setItem('em-last-day', today)
      setStreak(s => s + 1)
    }
    const params = new URLSearchParams(window.location.search)
    if (params.get('sub') === 'success') {
      setPage('home')
      window.history.replaceState({}, '', '/')
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setAuthLoading(false)
      if (u) {
        try {
          const data = await loadProgress(u.uid)
          if (data?.progress) setProgress(data.progress)
          if (data?.streak) setStreak(data.streak)
          if (data?.subscription) setSubscription(data.subscription)
          else {
            const sub = await getSubscription(u.uid)
            if (sub) setSubscription(sub)
          }
          setTrial(getTrialStatus(u))
        } catch {}
      } else {
        setSubscription(null)
        setTrial({ active: false, daysLeft: 0 })
      }
    })
    return unsub
  }, [])

  const syncToCloud = useCallback((prog, str, uid) => {
    if (!uid) return
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      saveProgress(uid, prog, str, user?.displayName).catch(() => {})
    }, 1500)
  }, [user])

  function completeLesson(id) {
    setProgress(p => {
      const next = { ...p, lessons: { ...p.lessons, [id]: true } }
      syncToCloud(next, streak, user?.uid)
      return next
    })
  }

  function completeLesson(id) {
    setProgress(p => ({ ...p, lessons: { ...p.lessons, [id]: true } }))
  }

  function finishQuiz(id, score) {
    setProgress(p => {
      const prev = p.quizzes?.[id]
      const next = { ...p, quizzes: { ...p.quizzes, [id]: prev === undefined ? score : Math.max(prev, score) } }
      syncToCloud(next, streak, user?.uid)
      return next
    })
  }

  function learnWord(id) {
    setProgress(p => {
      const vocab = p.vocab || []
      const next = { ...p, vocab: vocab.includes(id) ? vocab.filter(v => v !== id) : [...vocab, id] }
      syncToCloud(next, streak, user?.uid)
      return next
    })
  }

  async function handleLogout() {
    await signOut(auth)
    setUser(null)
    setSubscription(null)
    setTrial({ active: false, daysLeft: 0 })
  }

  const hasAccess = subscription?.status === 'active' || trial?.active

  function gatedPage(component) {
    if (!user) return <PricingPage user={user} onAuthClick={() => setShowAuth(true)} subscription={subscription} trial={trial} />
    if (!hasAccess) return <PricingPage user={user} onAuthClick={() => setShowAuth(true)} subscription={subscription} trial={trial} />
    return component
  }

  if (authLoading) return <div className="auth-loading"><div className="auth-spinner" /></div>

  return (
    <LangContext.Provider value={{ t, lang, setLang }}>
      <Nav page={page} setPage={setPage} streak={streak} user={user} onAuthClick={() => setShowAuth(true)} onLogout={handleLogout} />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={(u) => { setUser(u); setShowAuth(false); setTrial(getTrialStatus(u)) }} />}
      <main>
        {page === 'home' && <Home progress={progress} setPage={setPage} />}
        {page === 'lessons' && gatedPage(<Lessons progress={progress} onComplete={completeLesson} />)}
        {page === 'quizzes' && gatedPage(<Quizzes progress={progress} onFinish={finishQuiz} />)}
        {page === 'vocabulary' && gatedPage(<Vocabulary progress={progress} onLearn={learnWord} />)}
        {page === 'ai' && gatedPage(<AITutor />)}
        {page === 'writing' && gatedPage(<WritingAssistant />)}
        {page === 'pricing' && <PricingPage user={user} onAuthClick={() => setShowAuth(true)} subscription={subscription} trial={trial} />}
        {page === 'leaderboard' && <Leaderboard currentUid={user?.uid} />}
        {page === 'privacy' && <PrivacyPolicy />}
        {page === 'terms' && <TermsOfService />}
        {page === 'admin' && <AdminDashboard />}
      </main>
      {installPrompt && (
        <div className="pwa-banner">
          <span>{t.installPrompt}</span>
          <button className="btn-primary" style={{ padding: '8px 20px', fontSize: '.9rem' }} onClick={() => {
            installPrompt.prompt()
            installPrompt.userChoice.then(() => setInstallPrompt(null))
          }}>{t.install}</button>
          <button className="pwa-dismiss" onClick={() => setInstallPrompt(null)}>✕</button>
        </div>
      )}
      <footer className="footer">
        <p>{t.footerText}</p>
        <div className="footer-links">
          <button className="footer-link" onClick={() => setPage('privacy')}>{t.privacy}</button>
          <span className="footer-sep">·</span>
          <button className="footer-link" onClick={() => setPage('terms')}>{t.terms}</button>
          <span className="footer-sep">·</span>
          <button className="footer-link" onClick={() => setPage('admin')} style={{ opacity: 0.4, fontSize: '.75rem' }}>{t.admin}</button>
        </div>
      </footer>
    </LangContext.Provider>
  )
}
