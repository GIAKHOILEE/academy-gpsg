// export enum HomeworkType {
//   MCQ = 1,
//   ESSAY = 2,
// }

export enum QuestionType {
  MCQ_SINGLE = 1, // 1 đáp án đúng
  MCQ_MULTI = 2, // nhiều đáp án đúng
  ESSAY = 3, // tự luận
}

export enum SubmissionStatus {
  PENDING = 1, // chờ chấm (essay) hoặc chờ xử lý
  AUTO_GRADED = 2,
  GRADED = 3, // đã chấm tay
}
