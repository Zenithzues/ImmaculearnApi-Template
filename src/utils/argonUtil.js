import argon2 from "argon2";
const PEPPER = process.env.PASSWORD_PEPPER;

export async function hashPassword(password) {
  return argon2.hash(password + PEPPER, {
    type: argon2.argon2id,
    memoryCost: 2 ** 17,
    timeCost: 3,
    parallelism: 2
  });
}

export async function verifyPassword(hash, password) {
//   console.log(PEPPER)
  return argon2.verify(hash, password + PEPPER);
}


// const hashed = await hashPassword("esmabe1129")
// const unhashed = await verifyPassword(hashed, "esmabe1129")

// console.log(hashed)
// console.log(unhashed)


