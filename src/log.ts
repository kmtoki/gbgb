export default class Log {
  data: [string];
  limit: number;

  constructor() {
    data = [];
    limit = 0xfff;
  }

  log(s: string) {
    if (this.limit < this.data.length) {
      this.data.shift();
    }
    this.data.push(s);
  }

  show(n: number) {
    for (let i = 0; i < n; i++) {
      console.log(this.data.length - i, this.data[this.data.length - i]);
    }
  }
}
