# node-bc

[![npm version](https://badge.fury.io/js/node-bc.svg)](https://badge.fury.io/js/node-bc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern TypeScript/Node.js wrapper for the BiblioCommons library system API. BiblioCommons is used by many public libraries across North America to manage their catalogs and provide online services.

## Features

- 🔐 Secure authentication with BiblioCommons accounts
- 🔍 Search library catalogs
- 📚 View current holds
- 📌 Place holds on available items
- 🍪 Automatic session management with cookies
- 💪 Full TypeScript support with type definitions
- ⚡ Modern async/await API
- 🔄 Updated dependencies (no deprecated packages)

## Installation

```bash
npm install node-bc
```

## Requirements

- Node.js >= 14.0.0
- A BiblioCommons library account (username and PIN)

## Quick Start

```typescript
import { Bibliocommons } from 'node-bc';

// Initialize the client with your library city and credentials
const client = new Bibliocommons({
  city: 'seattle',      // Your library's BiblioCommons subdomain
  username: 'your-username',
  pin: 'your-pin'
});

// Login to your account
await client.login();

// Search for books
const results = await client.search('The Great Gatsby');
console.log(results);

// View your current holds
const holds = await client.holds();
console.log(holds);
```

## API Reference

### Constructor

```typescript
new Bibliocommons(props: ClassProps)
```

**Parameters:**
- `props.city` (string): The BiblioCommons subdomain for your library (e.g., 'seattle', 'nypl', 'vpl')
- `props.username` (string): Your library account username
- `props.pin` (string): Your library account PIN

**Example:**
```typescript
const client = new Bibliocommons({
  city: 'seattle',
  username: 'john.doe',
  pin: '1234'
});
```

### Methods

#### `login()`

Authenticates with the BiblioCommons system using the credentials provided in the constructor.

**Returns:** `Promise<LoginResponse>`

**Example:**
```typescript
try {
  await client.login();
  console.log('Successfully logged in!');
} catch (error) {
  console.error('Login failed:', error);
}
```

---

#### `search(query, category?)`

Searches the library catalog for items matching the query.

**Parameters:**
- `query` (string): The search query
- `category` (string, optional): The search category (default: "keyword")
  - Options: "keyword", "title", "author", "subject", etc.

**Returns:** `Promise<Book[]>`

**Example:**
```typescript
// Search by keyword
const books = await client.search('javascript programming');

// Search by title
const books = await client.search('1984', 'title');

// Search by author
const books = await client.search('George Orwell', 'author');
```

**Book Object Structure:**
```typescript
interface Book {
  title: string;        // Book title
  author: string;       // Author name
  id: string;          // Unique item ID
  format: string;      // Format (e.g., "Book", "eBook", "Audiobook")
  callNumber: string;  // Library call number
  availability: string; // Availability status
  holds: string;       // Number of holds
}
```

---

#### `holds()`

Retrieves the list of items currently on hold for your account.

**Returns:** `Promise<Book[]>`

**Example:**
```typescript
const myHolds = await client.holds();
console.log(`You have ${myHolds.length} items on hold`);

myHolds.forEach(book => {
  console.log(`${book.title} by ${book.author} - ${book.availability}`);
});
```

---

#### `placeHold(book, location)`

Places a hold on an item at a specified library branch.

**Parameters:**
- `book` (Book): The book object (from search results)
- `location` (string): The name of the library branch for pickup

**Returns:** `Promise<string>` - Success message key

**Example:**
```typescript
const searchResults = await client.search('Dune');
const book = searchResults[0];

try {
  const message = await client.placeHold(book, 'Central Branch');
  console.log('Hold placed successfully:', message);
} catch (error) {
  console.error('Failed to place hold:', error);
}
```

## Finding Your City Code

Your city code is the subdomain used in your library's BiblioCommons URL. For example:

- Seattle Public Library: `seattle.bibliocommons.com` → city: `"seattle"`
- New York Public Library: `nypl.bibliocommons.com` → city: `"nypl"`
- Vancouver Public Library: `vpl.bibliocommons.com` → city: `"vpl"`
- Toronto Public Library: `torontopubliclibrary.bibliocommons.com` → city: `"torontopubliclibrary"`

## Complete Example

```typescript
import { Bibliocommons } from 'node-bc';

async function main() {
  // Initialize client
  const client = new Bibliocommons({
    city: 'seattle',
    username: process.env.LIBRARY_USERNAME!,
    pin: process.env.LIBRARY_PIN!
  });

  try {
    // Login
    console.log('Logging in...');
    await client.login();
    console.log('✓ Logged in successfully');

    // Search for books
    console.log('\nSearching for "Node.js"...');
    const books = await client.search('Node.js', 'keyword');
    console.log(`Found ${books.length} results`);

    // Display first 3 results
    books.slice(0, 3).forEach((book, i) => {
      console.log(`\n${i + 1}. ${book.title}`);
      console.log(`   Author: ${book.author}`);
      console.log(`   Format: ${book.format}`);
      console.log(`   Status: ${book.availability}`);
    });

    // View current holds
    console.log('\nChecking your holds...');
    const holds = await client.holds();
    console.log(`You have ${holds.length} items on hold`);

    // Place a hold (if results were found)
    if (books.length > 0) {
      console.log('\nPlacing hold on first result...');
      const result = await client.placeHold(books[0], 'Central Library');
      console.log('✓ Hold placed:', result);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

## TypeScript Support

This library is written in TypeScript and includes full type definitions. No need to install separate `@types` packages.

```typescript
import { Bibliocommons, Book } from 'node-bc';

const client: Bibliocommons = new Bibliocommons({
  city: 'seattle',
  username: 'user',
  pin: '1234'
});

const books: Book[] = await client.search('typescript');
```

## Error Handling

All methods return Promises and may throw errors. Always use try-catch blocks or `.catch()` handlers:

```typescript
try {
  await client.login();
} catch (error) {
  if (error.message.includes('Login failed')) {
    console.error('Invalid credentials');
  } else {
    console.error('Network error:', error);
  }
}
```

## Migration from v1.x

Version 2.0 includes breaking changes:

1. **Deprecated `request` library removed** - Now uses `axios`
2. **All methods now use async/await** - Remove callback-style code
3. **Improved TypeScript types** - Better type safety
4. **Error handling changes** - Errors are thrown instead of callback rejections

### Migration Example

**v1.x (Old):**
```javascript
const bc = require('node-bc');
bc.search('query', (err, results) => {
  if (err) console.error(err);
  else console.log(results);
});
```

**v2.x (New):**
```typescript
import { Bibliocommons } from 'node-bc';
const client = new Bibliocommons({ city, username, pin });
try {
  const results = await client.search('query');
  console.log(results);
} catch (err) {
  console.error(err);
}
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Clean build artifacts
npm run clean
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © David Petersen

## Disclaimer

This is an unofficial wrapper for BiblioCommons. It uses web scraping techniques as BiblioCommons does not provide an official public API. This means:

- The library may break if BiblioCommons changes their website structure
- Use responsibly and respect BiblioCommons' terms of service
- This library is for personal/educational use

## Author

David Petersen
- Website: [thedjpetersen.com](http://thedjpetersen.com/)
- GitHub: [@thedjpetersen](https://github.com/thedjpetersen)

## Support

If you encounter any issues or have questions:
- Open an issue on [GitHub](https://github.com/thedjpetersen/node-bc/issues)
- Check existing issues for solutions
