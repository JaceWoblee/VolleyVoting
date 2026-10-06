export const LEGACY_TOTAL_SESSIONS = 19;

export const LEGACY_ATTENDANCE: Record<string, number> = {
  "Ainoa": 9,
  "Anaïs": 17,
  "Eda": 13,
  "Eli": 11,
  "Elonie": 19,
  "Jeanne": 11,
  "Laura": 19,
  "Maria": 17,
  "Seraina": 12,
  "Sofia": 19,
  "Tina": 16,
  "Vera": 15,
  "Yarina": 12
};

export const LEGACY_TOTAL_MATCH_BALLS = 200; 

// NEW: The old decimals multiplied by 45 and rounded
export const LEGACY_MATCH_BALLS: Record<string, number> = {
  "Ainoa": 0,   
  "Anaïs": 160, 
  "Eda": 120,   
  "Eli": 120, 
  "Elonie": 27, 
  "Jeanne": 138, 
  "Laura": 62,  
  "Maria": 160, 
  "Seraina": 90, 
  "Sofia": 120, 
  "Tina": 120, 
  "Vera": 110, 
  "Yarina": 173 
};

export const PLAYER_ROLES: Record<string, string> = {
  "Jeanne": "Pass", "Laura": "Pass",
  "Yarina": "Libera", "Elonie": "Libera",
  "Ainoa": "Neben", "Maria": "Neben", "Eda": "Neben", "Sofia": "Neben",
  "Vera": "Dia", "Seraina": "Dia",
  "Anaïs": "Mitte", "Tina": "Mitte", "Eli": "Mitte"
};