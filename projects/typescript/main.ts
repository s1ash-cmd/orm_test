import 'reflect-metadata';
import { Column, DataSource, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

@Entity('books')
class Book {
  @PrimaryGeneratedColumn() id!: number;
  @Column({type:'text'}) title!: string;
  @OneToMany(() => Loan, loan => loan.book) loans!: Loan[];
}
@Entity('loans')
class Loan {
  @PrimaryGeneratedColumn() id!: number;
  @Column({name:'book_id', type:'integer'}) bookId!: number;
  @ManyToOne(() => Book, book => book.loans, {nullable:false})
  @JoinColumn({name:'book_id'}) book!: Book;
}
const mode = process.argv[2] ?? 'demo';
const root = path.resolve(__dirname, '../../..');
const dbPath = path.resolve(process.env.ORM_DB_PATH ?? path.join(root,
  mode === 'bench' ? 'benchmark/library.db' : 'projects/typescript/demo.db'));
const source = new DataSource({type:'better-sqlite3', database:dbPath,
  entities:[Book,Loan], synchronize:mode === 'demo', logging:mode === 'demo',
  statementCacheSize:0});
type Row = (number | string)[];
async function demo() {
  await source.transaction(async manager => {
    const books = manager.getRepository(Book);
    const loans = manager.getRepository(Loan);
    const book = await books.save(books.create({title:'ORM на практике'}));
    const loan = await loans.save(loans.create({bookId:book.id}));
    await books.update(book.id, {title:'ORM и SQL'});
    const loaded = await books.findOneOrFail({where:{id:book.id}, relations:{loans:true}});
    if (loaded.title !== 'ORM и SQL' || loaded.loans.length !== 1) throw Error('Не удалось проверить изменение книги и загрузку выдачи.');
    console.log(`Книга ${loaded.id}: ${loaded.title}; выдач: ${loaded.loans.length}`);
    await loans.delete(loan.id);
    await books.delete(book.id);
    if (await books.findOneBy({id:book.id})) throw Error('Книга осталась в базе после удаления.');
  });
  console.log('CRUD и связь 1:N проверены; демонстрационные записи удалены.');
}
async function bench() {
  const raw = new Database(dbPath, {readonly:true});
  async function orm(kind:string, start:number):Promise<Row[]> {
    if (kind === 'join') {
      const rows = await source.getRepository(Loan).createQueryBuilder('l')
        .innerJoin('l.book','b').select('l.id','id').addSelect('l.book_id','book_id')
        .addSelect('b.title','title').where('l.id >= :start',{start}).orderBy('l.id')
        .limit(100).getRawMany();
      return rows.map(r => [r.id,r.book_id,r.title]);
    }
    let q = source.getRepository(Book).createQueryBuilder('b');
    q = kind === 'point' ? q.where('b.id = :start',{start}) :
      q.where('b.id >= :start',{start}).orderBy('b.id').limit(100);
    return (await q.getMany()).map(b => [b.id,b.title]);
  }
  function sql(kind:string, start:number):Row[] {
    if (kind === 'join') return raw.prepare('SELECT l.id,l.book_id,b.title FROM loans l JOIN books b ON b.id=l.book_id WHERE l.id>=? ORDER BY l.id LIMIT 100').raw().all(start) as Row[];
    const query = kind === 'point' ? 'SELECT id,title FROM books WHERE id=?' :
      'SELECT id,title FROM books WHERE id>=? ORDER BY id LIMIT 100';
    const books = (raw.prepare(query).all(start) as {id:number,title:string}[])
      .map(r => Object.assign(new Book(),r));
    return books.map(b => [b.id,b.title]);
  }
  const results = [];
  for (const kind of ['point','range','join']) {
    for (const start of [1,2501,5001]) if (JSON.stringify(await orm(kind,start)) !== JSON.stringify(sql(kind,start))) throw Error('Результаты ORM и прямого SQL не совпадают.');
    const samples:Record<string,number[]> = {orm:[],sql:[]};
    for (let i=0;i<50;i++) {await orm(kind,1+i);sql(kind,1+i);}
    for (let r=0;r<7;r++) for (const name of r%2 === 0 ? ['orm','sql'] : ['sql','orm']) {
      for (let i=0;i<300;i++) {
        const start = 1 + ((i*37+r*101)%9000);
        const t = process.hrtime.bigint();
        // Для обоих путей учитываем одинаковый переход через await.
        const rows = await (name === 'orm' ? orm(kind,start) : sql(kind,start));
        samples[name].push(Number(process.hrtime.bigint()-t)/1000);
        if (rows.length !== (kind === 'point' ? 1 : 100)) throw Error('Запрос вернул неверное число строк.');
      }
    }
    for (const [method,xs] of Object.entries(samples)) {
      const sorted = [...xs].sort((a,b)=>a-b);
      results.push({case:kind,method,median_us:(sorted[1049]+sorted[1050])/2,
        p95_us:sorted[Math.ceil(sorted.length*.95)-1],samples_us:xs});
    }
  }
  console.log(JSON.stringify({language:'TypeScript',orm:'TypeORM 0.3.31',
    sqlite:(raw.prepare('select sqlite_version() as v').get() as {v:string}).v,results}));
  raw.close();
}
async function main() {
  if (!['bench','demo'].includes(mode)) throw Error('Укажите режим demo или bench.');
  if (mode === 'bench' && !fs.existsSync(dbPath)) throw Error('Сначала python benchmark/seed.py');
  await source.initialize();
  try { if (mode === 'demo') await demo(); else await bench(); }
  finally { await source.destroy(); }
}
main().catch(err=>{ console.error(err);process.exitCode=1; });
