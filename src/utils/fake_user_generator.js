import { faker } from "@faker-js/faker"; // npm install @faker-js/faker

const fake_students = [];

for (let i = 0; i < 5; i++) {
  fake_students.push({
    student_fn: faker.person.firstName(),
    student_ln: faker.person.lastName(),
    student_bd: faker.date.birthdate({ min: 18, max: 25, mode: "age" }),
    student_gender: faker.helpers.arrayElement(["M", "F"]),
    student_course: faker.helpers.arrayElement(["BSCS"]),
    student_yr_lvl: faker.helpers.arrayElement(["1", "2", "3", "4"]),
  });
}

console.log("FAKE STUDENTS:", fake_students);

// NEED KO NALANG ACCOUNT_ID
