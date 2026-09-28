# What problem does TypeScript solve, and how do you use its types in an API project?

- **Category:** Fundamental Questions
- **Source ID:** typescript-value-in-api-project
- **URL:** https://www.lst97.dev/chat

TypeScript mainly helps solve the weak typing issues in JavaScript. Although TypeScript is eventually compiled into JavaScript, having strongly defined types makes the code easier to read, understand, and maintain. For example, shared types can be reused when the server returns data to the frontend. With TypeScript, we can also use libraries such as Hey API to automatically generate types for APIs built with technologies such as Python, Node.js, or Bun. When the types change on the server, the generated frontend types can also be updated. This means we do not need to manually track and update every frontend type whenever an object or API response changes on the server.
