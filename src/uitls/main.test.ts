import { generateRandomIntegerSequence, generateRandomString, randomSequenceFromList, samplingFromList, saveDataToClientDevice } from "./main";

describe("generateRandomString", () => {
    test("should return a string of the specified length", () => {
        const length = 10;
        const result = generateRandomString(length);
        expect(result.length).toEqual(length);
    });
});

describe("generateRandomIntegerSequence", () => {
    test("should return an array of the specified length", () => {
        const length = 10;
        const min = 0;
        const max = 10;
        const result = generateRandomIntegerSequence(length, min, max);
        expect(result.length).toEqual(length);
    });
    test("should return an array of integers between the specified min and max", () => {
        const length = 10;
        const min = 0;
        const max = 10;
        const result = generateRandomIntegerSequence(length, min, max);
        result.forEach((element) => {
            expect(element).toBeGreaterThanOrEqual(min);
            expect(element).toBeLessThanOrEqual(max);
        });
    });
});

describe("randomSequenceFromList", () => {
    test("should return an array of the same length as the input list", () => {
        const list = [1, 2, 3, 4, 5];
        const result = randomSequenceFromList(list);
        expect(result.length).toEqual(list.length);
    });
    test("should return an array of elements from the input list", () => {
        const list = [1, 2, 3, 4, 5];
        const result = randomSequenceFromList(list);
        result.forEach((element) => {
            expect(list.includes(element)).toBeTruthy();
        });
    });
});

describe("samplingFromList", () => {
    test("should return an array of the specified length", () => {
        const list = [1, 2, 3, 4, 5];
        const num = 3;
        const replace = true;
        const result = samplingFromList(list, num, replace);
        expect(result.length).toEqual(num);
    });
    test("should return an array of elements from the input list", () => {
        const list = [1, 2, 3, 4, 5];
        const num = 3;
        const replace = true;
        const result = samplingFromList(list, num, replace);
        result.forEach((element) => {
            expect(list.includes(element)).toBeTruthy();
        });
    });
});
