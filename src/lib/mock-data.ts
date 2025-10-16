// Mock data for development without MySQL
export const mockUsers: any[] = [];

export const mockPlayers = [
  {
    id: 1,
    name: 'Nico Vehi',
    team: 'FC Bufas',
    position1: 'ST',
    position2: 'CAM',
    pace: 85,
    shooting: 88,
    passing: 82,
    defending: 45,
    physical: 78,
    fifa_rating: 84,
    market_value: 25000.00,
    fantasy_points: 120,
    image_url: '/images/players/nico-vehi.jpg',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Pablo Vehi',
    team: 'FC Bufas',
    position1: 'RB',
    position2: 'CM',
    pace: 78,
    shooting: 65,
    passing: 85,
    defending: 88,
    physical: 82,
    fifa_rating: 81,
    market_value: 18000.00,
    fantasy_points: 95,
    image_url: '/images/players/pablo-vehi.jpg',
    created_at: new Date().toISOString()
  }
];

let userIdCounter = 1;

export function mockExecuteQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
  console.log('Mock Query:', query, params);
  return Promise.resolve([]);
}

export function mockExecuteQuerySingle<T = any>(query: string, params?: any[]): Promise<T | null> {
  console.log('Mock Query Single:', query, params);
  
  // Handle user registration
  if (query.includes('SELECT id FROM users WHERE email = ? OR username = ?')) {
    const [email, username] = params || [];
    const existingUser = mockUsers.find(u => u.email === email || u.username === username);
    return Promise.resolve(existingUser || null);
  }
  
  // Handle user creation
  if (query.includes('INSERT INTO users')) {
    return Promise.resolve({ insertId: userIdCounter++ } as any);
  }
  
  // Handle user lookup by ID
  if (query.includes('SELECT id, username, email, coins FROM users WHERE id = ?')) {
    const [userId] = params || [];
    const user = mockUsers.find(u => u.id === userId);
    return Promise.resolve(user || null);
  }
  
  // Handle login
  if (query.includes('SELECT id, username, email, password_hash, coins FROM users WHERE email = ?')) {
    const [email] = params || [];
    const user = mockUsers.find(u => u.email === email);
    return Promise.resolve(user || null);
  }
  
  return Promise.resolve(null);
}

export async function mockExecuteTransaction<T>(
  callback: (connection: any) => Promise<T>
): Promise<T> {
  const mockConnection = {
    execute: async (query: string, params?: any[]) => {
      console.log('Mock Transaction Query:', query, params);
      
      if (query.includes('INSERT INTO users')) {
        const newUser = {
          id: userIdCounter++,
          username: params?.[0] || 'test',
          email: params?.[1] || 'test@test.com',
          password_hash: params?.[2] || 'hashed',
          coins: params?.[3] || 1000,
          created_at: new Date().toISOString()
        };
        mockUsers.push(newUser);
        return [{ insertId: newUser.id }];
      }
      
      return [{}];
    }
  };
  
  return await callback(mockConnection);
}