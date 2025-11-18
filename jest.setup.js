// jest.setup.js
jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: jest.fn().mockImplementation(() => ({
    limit: jest.fn().mockResolvedValue({ success: true }),
  })),
}))

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(),
}))
