import { Bibliocommons, Book } from '../index';
import nock from 'nock';

describe('Bibliocommons', () => {
  let client: Bibliocommons;
  const testCity = 'seattle';
  const testUsername = 'testuser';
  const testPin = '1234';
  const baseUrl = `https://${testCity}.bibliocommons.com`;

  beforeEach(() => {
    client = new Bibliocommons({
      city: testCity,
      username: testUsername,
      pin: testPin,
    });
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Constructor', () => {
    it('should create a new instance with correct properties', () => {
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(Bibliocommons);
    });
  });

  describe('login()', () => {
    it('should successfully login with valid credentials', async () => {
      // Mock the initial login page request
      nock(baseUrl)
        .get('/user/login')
        .reply(200, '<input name="authenticity_token" value="test-token-123" />');

      // Mock the login POST request
      nock(baseUrl)
        .post('/user/login')
        .query({ destination: '%2Fdashboard%2Fuser_dashboard' })
        .reply(200, { success: true });

      const result = await client.login();
      expect(result).toEqual({ success: true });
    });

    it('should throw error when authenticity token is not found', async () => {
      nock(baseUrl)
        .get('/user/login')
        .reply(200, '<html><body>No token here</body></html>');

      await expect(client.login()).rejects.toThrow('Could not find authenticity token');
    });

    it('should throw error on failed login', async () => {
      nock(baseUrl)
        .get('/user/login')
        .reply(200, '<input name="authenticity_token" value="test-token-123" />');

      nock(baseUrl)
        .post('/user/login')
        .query({ destination: '%2Fdashboard%2Fuser_dashboard' })
        .reply(401, { success: false });

      await expect(client.login()).rejects.toThrow('Login failed with status 401');
    });
  });

  describe('search()', () => {
    const mockSearchResults = `
      <div class="cp-search-result-item-content">
        <div class="title-content">The Great Gatsby</div>
        <a class="author-link">F. Scott Fitzgerald</a>
        <div class="cp-manifestation-list-item">
          <div class="manifestation-item-format-info-wrap">
            <a href="/item/show/12345">View Item</a>
          </div>
          <div class="cp-format-indicator"><span>Book</span></div>
          <div class="cp-call-number">FIC FIT</div>
          <div class="cp-availability-status">Available</div>
          <div class="cp-hold-counts">2 holds</div>
        </div>
      </div>
    `;

    it('should search for books successfully', async () => {
      nock(baseUrl)
        .get('/search')
        .query({
          'utf-8': '✓',
          commit: 'Search',
          t: 'smart',
          q: 'gatsby',
          search_category: 'keyword',
        })
        .reply(200, mockSearchResults);

      const results = await client.search('gatsby');

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        title: expect.stringContaining('Great Gatsby'),
        author: expect.stringContaining('Fitzgerald'),
        id: '12345',
        format: 'Book',
        availability: expect.stringContaining('Available'),
      });
    });

    it('should search with custom category', async () => {
      nock(baseUrl)
        .get('/search')
        .query({
          'utf-8': '✓',
          commit: 'Search',
          t: 'smart',
          q: 'fitzgerald',
          search_category: 'author',
        })
        .reply(200, mockSearchResults);

      const results = await client.search('fitzgerald', 'author');
      expect(results).toHaveLength(1);
    });

    it('should throw error when query is empty', async () => {
      await expect(client.search('')).rejects.toThrow('Must provide a query');
    });

    it('should return empty array when no results found', async () => {
      nock(baseUrl)
        .get('/search')
        .query(true)
        .reply(200, '<html><body>No results</body></html>');

      const results = await client.search('nonexistentbook12345');
      expect(results).toEqual([]);
    });
  });

  describe('holds()', () => {
    const mockHoldsHtml = `
      <div class="cp-bib-list-item">
        <div class="title-content">1984</div>
        <a class="author-link">George Orwell</a>
        <div class="cp-manifestation-list-item">
          <div class="manifestation-item-format-info-wrap">
            <a href="/item/show/67890">View Item</a>
          </div>
          <div class="cp-format-indicator"><span>Book</span></div>
          <div class="cp-call-number">FIC ORW</div>
          <div class="cp-availability-status">Ready for pickup</div>
          <div class="cp-hold-counts">5 holds</div>
        </div>
      </div>
    `;

    it('should retrieve current holds', async () => {
      nock(baseUrl)
        .get('/v2/holds')
        .reply(200, mockHoldsHtml);

      const holds = await client.holds();

      expect(holds).toHaveLength(1);
      expect(holds[0]).toMatchObject({
        title: expect.stringContaining('1984'),
        author: expect.stringContaining('Orwell'),
        id: '67890',
        format: 'Book',
      });
    });

    it('should return empty array when no holds', async () => {
      nock(baseUrl)
        .get('/v2/holds')
        .reply(200, '<html><body>No holds</body></html>');

      const holds = await client.holds();
      expect(holds).toEqual([]);
    });
  });

  describe('placeHold()', () => {
    const testBook: Book = {
      title: 'Test Book',
      author: 'Test Author',
      id: '12345',
      format: 'Book',
      callNumber: 'TEST 123',
      availability: 'Available',
      holds: '0',
    };

    const mockSelectHoldHtml = `
      <input name="authenticity_token" value="hold-token-456" />
      <select name="branch" class="selectpicker">
        <option value="branch-1">Central Library</option>
        <option value="branch-2">North Branch</option>
      </select>
    `;

    it('should place hold successfully', async () => {
      nock(baseUrl)
        .get('/holds/select_hold/12345')
        .reply(200, mockSelectHoldHtml);

      nock(baseUrl)
        .post('/holds/request_hold/12345.json')
        .reply(200, {
          success: true,
          messages: [{ key: 'hold_placed_successfully' }],
        });

      const result = await client.placeHold(testBook, 'Central Library');
      expect(result).toBe('hold_placed_successfully');
    });

    it('should throw error when authenticity token not found', async () => {
      nock(baseUrl)
        .get('/holds/select_hold/12345')
        .reply(200, '<html>No token</html>');

      await expect(client.placeHold(testBook, 'Central Library'))
        .rejects.toThrow('Could not find authenticity token');
    });

    it('should throw error when branch location not found', async () => {
      nock(baseUrl)
        .get('/holds/select_hold/12345')
        .reply(200, mockSelectHoldHtml);

      await expect(client.placeHold(testBook, 'NonExistent Branch'))
        .rejects.toThrow('Could not find branch ID for location: NonExistent Branch');
    });

    it('should throw error when hold placement fails', async () => {
      nock(baseUrl)
        .get('/holds/select_hold/12345')
        .reply(200, mockSelectHoldHtml);

      nock(baseUrl)
        .post('/holds/request_hold/12345.json')
        .reply(200, {
          success: false,
          messages: [{ key: 'hold_limit_reached' }],
        });

      await expect(client.placeHold(testBook, 'Central Library'))
        .rejects.toThrow('hold_limit_reached');
    });
  });

  describe('Edge cases', () => {
    it('should handle network errors gracefully', async () => {
      nock(baseUrl)
        .get('/search')
        .query(true)
        .replyWithError('Network error');

      await expect(client.search('test')).rejects.toThrow();
    });

    it('should handle malformed HTML gracefully', async () => {
      nock(baseUrl)
        .get('/search')
        .query(true)
        .reply(200, 'Not valid HTML <<>>');

      const results = await client.search('test');
      expect(results).toEqual([]);
    });
  });
});
