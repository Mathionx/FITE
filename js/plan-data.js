/* ==========================================================================
   FITE — plan-data.js
   All content here is extracted directly from the user's personal fitness &
   life plan. Wording of plan items is kept intact. This is used to SEED the
   app on first run only — every value the user edits afterwards is stored
   in IndexedDB and takes priority over these defaults (see js/*.js pages).
   ========================================================================== */

const PlanData = {

  appName: 'FITE',
  tagline: 'Stand taller. Move stronger.',

  quotes: [
    { text: "I promise it will be perfect if I have patience.", bg: 'g1' },
    { text: "We'll aim for the best version of your body, not perfection.", bg: 'g2' },
    { text: "You're only 19 — your body can still adapt really well.", bg: 'g3' },
    { text: "Not just that you've gained muscle, but that you stand taller, move more confidently, and feel stronger.", bg: 'g4' },
    { text: "By the time you're ready to sprint, we'll make sure your body is ready for it too. 👊🔥", bg: 'g5' },
  ],

  priorities: [
    'Fix posture.',
    'Strengthen hips, knees, and ankles.',
    'Build muscle all over your body.',
    'Improve flexibility.',
    'Lose a little fat while gaining muscle.',
    'Prepare for sprinting later.'
  ],

  goals12Week: [
    'Weight: around 72–74 kg, but with more muscle and less fat.',
    'Better posture.',
    'Better hip mobility.',
    'Stronger glutes.',
    'Stable ankles.',
    'Pain-free squats.',
    'Comfortable jogging.',
    'Sprint training after your foundation is built.'
  ],

  fastingNote: '16:8 Fasting',

  // Daily schedule — used to seed the Checklist
  dailySchedule: [
    { id:'wake', time:'05:30', label:'Wake up' },
    { id:'water', time:'05:30', label:'Drink 500–700 mL water' },
    { id:'stretch5', time:'05:35', label:'5 minutes of light stretching' },
    { id:'walk', time:'06:00', label:'20–30 minute walk' },
    { id:'study', time:'07:00', label:'Study (Applied Maths + Programming)' },
    { id:'coffee', time:'07:00', label:'Black coffee or tea is okay if you want' },
    { id:'meal1', time:'12:00', label:'🍳 Meal 1 (break your fast)' },
    { id:'snack', time:'15:30', label:'🍌 Snack' },
    { id:'gym', time:'17:00', label:'🏋️ Gym' },
    { id:'dinner', time:'18:30', label:'🍗 Dinner' },
    { id:'milk', time:'20:30', label:'Milk or yogurt if available' },
    { id:'flex', time:'21:00', label:'Flexibility (10–15 min)' },
    { id:'sleep', time:'21:30', label:'Sleep' },
  ],

  meal1Items: ['4 eggs', 'Injera or bread', 'Tomato + onion salad', 'Banana (or another fruit)'],
  snackItems: ['Roasted chickpeas or peanuts', 'Fruit'],
  dinnerItems: ['Chicken, beef, fish, lentils, or beans', 'Rice or injera', 'Vegetables'],

  // ---------------- Weekly Gym Plan ----------------
  gymWeek: [
    {
      day: 'Monday', title: 'Upper Body + Core', type:'gym',
      exercises: [
        { name:'Bench Press', sets:3, reps:'8–10' },
        { name:'Lat Pulldown or Pull-ups', sets:3, reps:'8–10' },
        { name:'Shoulder Press', sets:3, reps:'10' },
        { name:'Seated Row', sets:3, reps:'10' },
        { name:'Biceps Curl', sets:3, reps:'12' },
        { name:'Triceps Pushdown', sets:3, reps:'12' },
        { name:'Plank', sets:3, reps:'45 sec' },
      ],
      finish: ['Chest stretch', 'Shoulder stretch']
    },
    {
      day: 'Tuesday', title: 'Lower Body (Rehabilitation Day)', type:'gym',
      note: 'NO heavy squats yet.',
      exercises: [
        { name:'Glute Bridges', sets:3, reps:'15' },
        { name:'Clamshells', sets:3, reps:'15' },
        { name:'Side Leg Raises', sets:3, reps:'15' },
        { name:'Step-ups', sets:3, reps:'12' },
        { name:'Bodyweight Squats', sets:3, reps:'10' },
        { name:'Calf Raises', sets:4, reps:'20' },
        { name:'Single-leg Balance', sets:3, reps:'45 sec' },
      ],
      finish: ['Stretch hips afterward.']
    },
    {
      day: 'Wednesday', title: 'Flexibility & Walk', type:'flex',
      note: '30-minute walk. 30 minutes flexibility:',
      exercises: [
        { name:'Hip stretch' }, { name:'Hamstring stretch' }, { name:'Calf stretch' },
        { name:'Butterfly stretch' }, { name:'Cat-Cow' }, { name:'Thoracic rotations' },
      ]
    },
    {
      day: 'Thursday', title: 'Upper Body', type:'gym',
      exercises: [
        { name:'Incline Bench', sets:3, reps:'8–10' },
        { name:'Cable Row', sets:3, reps:'10' },
        { name:'Dumbbell Shoulder Press', sets:3, reps:'10' },
        { name:'Face Pulls', sets:3, reps:'12' },
        { name:'Hammer Curl', sets:3, reps:'12' },
        { name:'Triceps Extension', sets:3, reps:'12' },
      ],
      finish: ['Finish with posture exercises.']
    },
    {
      day: 'Friday', title: 'Lower Body', type:'gym',
      note: 'If Tuesday had NO pain:',
      exercises: [
        { name:'Goblet Squats (light)', sets:3, reps:'10' },
        { name:'Romanian Deadlift (light)', sets:3, reps:'10' },
        { name:'Split Squats', sets:3, reps:'10' },
        { name:'Calf Raises', sets:3, reps:'15' },
        { name:'Glute Bridge', sets:3, reps:'15' },
        { name:'Bird Dog', sets:3, reps:'10' },
        { name:'Dead Bug', sets:3, reps:'10' },
      ]
    },
    {
      day: 'Saturday', title: 'Walk, Core & Mobility', type:'mixed',
      exercises: [
        { name:'Walk' }, { name:'Core' }, { name:'Mobility' },
        { name:'Hip exercises' }, { name:'Ankle exercises' },
      ]
    },
    {
      day: 'Sunday', title: 'Complete Rest', type:'rest', exercises: [] },
  ],

  flexibilityNightly: {
    duration: '10–15 minutes',
    items: ['Butterfly stretch', 'Hip flexor stretch', 'Hamstring stretch', 'Calf stretch', "Child's Pose", 'Cat-Cow', 'Thoracic rotation'],
    note: "Don't force the stretches—hold each for about 20–30 seconds and breathe normally."
  },

  postureExercises: {
    note: 'Posture drills to finish upper-body and Thursday sessions with.',
    items: ['Chest stretch', 'Shoulder stretch', 'Thoracic rotations', 'Cat-Cow']
  },

  // ---------------- Food Plan (weekly) ----------------
  foodWeek: [
    { day:'Monday', breakfast:['4 eggs','Injera','Tomato'], dinner:['Chicken','Rice','Vegetables'] },
    { day:'Tuesday', breakfast:['Eggs','Bread',"Peanut butter (if available)"], dinner:['Lentils','Injera','Salad'] },
    { day:'Wednesday', breakfast:['Eggs','Oats (if available)'], dinner:['Beef','Rice','Vegetables'] },
    { day:'Thursday', breakfast:['Eggs','Bread','Banana'], dinner:["Fish (or beans if fish isn't available)",'Injera','Vegetables'] },
    { day:'Friday', breakfast:['Eggs','Sweet potato'], dinner:['Chicken','Rice'] },
    { day:'Saturday', breakfast:['Eggs','Bread'], dinner:['Lentils','Vegetables'] },
    { day:'Sunday', breakfast:['Enjoy family food 😊'], dinner:[] },
  ],

  mealRule: 'Each meal includes: Protein (eggs, meat, beans, lentils), Carbohydrates (injera, rice, bread, potatoes), Vegetables or fruit',

  supplements: {
    morning: ['Water'],
    moringaNote: "If you're taking moringa, take it with your first meal, not on an empty stomach.",
    waterGoal: 'Drink 2.5–3 liters of water each day.'
  },

  closingMessage: "Do you remember when you first came to me? We talked about your posture, your knee pain, your sprinting, your confidence, your studies, and even your YouTube ideas. Now we have a proper roadmap. When university starts, I want people to notice not just that you've gained muscle, but that you stand taller, move more confidently, and feel stronger. That's a much bigger win than just adding kilos to the barbell. We'll keep adjusting this plan as you improve. By the time you're ready to sprint, we'll make sure your body is ready for it too. 👊🔥",

  // Approximate macro reference for common plan foods (editable by the user in Foods settings).
  // Values are per typical serving used in this plan — rough estimates, not clinical data.
  macroDB: {
    '4 eggs':            { cal:280, protein:24, carbs:2,  fat:20 },
    'Eggs':               { cal:140, protein:12, carbs:1,  fat:10 },
    'Injera':              { cal:170, protein:5,  carbs:34, fat:1 },
    'Injera or bread':     { cal:170, protein:5,  carbs:34, fat:1 },
    'Bread':                { cal:160, protein:5,  carbs:30, fat:2 },
    'Tomato + onion salad': { cal:45,  protein:1,  carbs:9,  fat:0 },
    'Tomato':                { cal:20,  protein:1,  carbs:4,  fat:0 },
    'Banana (or another fruit)': { cal:105, protein:1, carbs:27, fat:0 },
    'Banana':                { cal:105, protein:1, carbs:27, fat:0 },
    'Roasted chickpeas or peanuts': { cal:210, protein:9, carbs:20, fat:12 },
    'Fruit':                  { cal:80,  protein:1, carbs:20, fat:0 },
    'Chicken, beef, fish, lentils, or beans': { cal:250, protein:35, carbs:2, fat:11 },
    'Chicken':                 { cal:240, protein:36, carbs:0, fat:9 },
    'Beef':                     { cal:250, protein:30, carbs:0, fat:14 },
    'Fish (or beans if fish isn\'t available)': { cal:220, protein:32, carbs:0, fat:9 },
    'Lentils':                   { cal:230, protein:18, carbs:40, fat:1 },
    'Beans':                      { cal:220, protein:15, carbs:40, fat:1 },
    'Rice or injera':              { cal:210, protein:4, carbs:45, fat:1 },
    'Rice':                          { cal:205, protein:4, carbs:45, fat:0 },
    'Vegetables':                     { cal:60,  protein:3, carbs:12, fat:0 },
    'Milk or yogurt if available':    { cal:150, protein:8, carbs:12, fat:8 },
    'Peanut butter (if available)':   { cal:190, protein:8, carbs:6,  fat:16 },
    'Oats (if available)':            { cal:150, protein:5, carbs:27, fat:3 },
    'Salad':                            { cal:40,  protein:1, carbs:8, fat:0 },
    'Sweet potato':                      { cal:180, protein:2, carbs:41, fat:0 },
    'Enjoy family food 😊':               { cal:600, protein:25, carbs:70, fat:20 },
  }
};
