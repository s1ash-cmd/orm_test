package main

import (
 "database/sql"
 "encoding/json"
 "fmt"
 "math"
 "os"
 "path/filepath"
 "sort"
 "time"

 "gorm.io/driver/sqlite"
 "gorm.io/gorm"
 "gorm.io/gorm/logger"
)

type Book struct {
 ID int `gorm:"primaryKey;autoIncrement"`
 Title string `gorm:"not null"`
 Loans []Loan `gorm:"foreignKey:BookID"`
}
type Loan struct {
 ID int `gorm:"primaryKey;autoIncrement"`
 BookID int `gorm:"column:book_id;not null;index"`
 Book Book `gorm:"foreignKey:BookID"`
}
type JoinRow struct { ID int; BookID int; Title string }
func must(err error) { if err != nil { panic(err) } }
func demo(db *gorm.DB) {
 must(db.AutoMigrate(&Book{}, &Loan{}))
 must(db.Transaction(func(tx *gorm.DB) error {
  book:=Book{Title:"ORM на практике"}
  if err:=tx.Create(&book).Error;err!=nil{return err}
  loan:=Loan{BookID:book.ID}
  if err:=tx.Create(&loan).Error;err!=nil{return err}
  if err:=tx.Model(&book).Update("title","ORM и SQL").Error;err!=nil{return err}
  var loaded Book
  if err:=tx.Preload("Loans").First(&loaded,book.ID).Error;err!=nil{return err}
  if loaded.Title!="ORM и SQL" || len(loaded.Loans)!=1 {return fmt.Errorf("CRUD")}
  fmt.Printf("Book %d: %s; loans=%d\n",loaded.ID,loaded.Title,len(loaded.Loans))
  if err:=tx.Delete(&loan).Error;err!=nil{return err}
  if err:=tx.Delete(&book).Error;err!=nil{return err}
  var count int64
  if err:=tx.Model(&Book{}).Where("id = ?",book.ID).Count(&count).Error;err!=nil{return err}
  if count!=0{return fmt.Errorf("DELETE")};return nil
 }))
 fmt.Println("CRUD и связь 1:N проверены; демонстрационные записи удалены.")
}
func bench(db *gorm.DB, raw *sql.DB) {
 orm:=func(kind string,start int) [][]any {
  out:=make([][]any,0)
  if kind=="join" {
   var rows []JoinRow
   must(db.Table("loans AS l").Select("l.id,l.book_id,b.title").Joins("JOIN books b ON b.id=l.book_id").Where("l.id >= ?",start).Order("l.id").Limit(100).Scan(&rows).Error)
   for _,r:=range rows {out=append(out,[]any{r.ID,r.BookID,r.Title})};return out
  }
  var books []Book
  q:=db.Select("id,title")
  if kind=="point" {q=q.Where("id = ?",start)} else {q=q.Where("id >= ?",start).Order("id").Limit(100)}
  must(q.Find(&books).Error)
  for _,b:=range books {out=append(out,[]any{b.ID,b.Title})};return out
 }
 direct:=func(kind string,start int) [][]any {
  query:="SELECT id,title FROM books WHERE id=?"
  if kind=="range" {query="SELECT id,title FROM books WHERE id>=? ORDER BY id LIMIT 100"}
  if kind=="join" {query="SELECT l.id,l.book_id,b.title FROM loans l JOIN books b ON b.id=l.book_id WHERE l.id>=? ORDER BY l.id LIMIT 100"}
  rows,err:=raw.Query(query,start);must(err);defer rows.Close()
  out:=make([][]any,0)
  for rows.Next() {
   if kind=="join" {var r JoinRow;must(rows.Scan(&r.ID,&r.BookID,&r.Title));out=append(out,[]any{r.ID,r.BookID,r.Title})} else {
    var b Book;must(rows.Scan(&b.ID,&b.Title));out=append(out,[]any{b.ID,b.Title})
   }
  };must(rows.Err());return out
 }
 results:=[]map[string]any{}
 for _,kind:=range []string{"point","range","join"} {
  for _,start:=range []int{1,2501,5001} {a,_:=json.Marshal(orm(kind,start));b,_:=json.Marshal(direct(kind,start));if string(a)!=string(b){panic("Mismatch")}}
  for i:=0;i<50;i++ {orm(kind,1+i);direct(kind,1+i)}
  samples:=map[string][]float64{"orm":{},"sql":{}}
  for r:=0;r<7;r++ {
   names:=[]string{"orm","sql"};if r%2==1 {names=[]string{"sql","orm"}}
   for _,name:=range names {
    fn:=orm;if name=="sql" {fn=direct}
    for i:=0;i<300;i++ {
     start:=1+((i*37+r*101)%9000);t:=time.Now();rows:=fn(kind,start)
     samples[name]=append(samples[name],float64(time.Since(t).Nanoseconds())/1000)
     expected:=100;if kind=="point"{expected=1};if len(rows)!=expected{panic("Count")}
    }
   }
  }
  for _,name:=range []string{"orm","sql"} {xs:=samples[name];sorted:=append([]float64(nil),xs...);sort.Float64s(sorted)
   results=append(results,map[string]any{"case":kind,"method":name,"median_us":(sorted[1049]+sorted[1050])/2,"p95_us":sorted[int(math.Ceil(float64(len(xs))*.95))-1],"samples_us":xs})
  }
 }
 var version string;must(raw.QueryRow("SELECT sqlite_version()").Scan(&version))
 must(json.NewEncoder(os.Stdout).Encode(map[string]any{"language":"Go","orm":"GORM 1.31.1","sqlite":version,"results":results}))
}
func main() {
 mode:="demo";if len(os.Args)>1 {mode=os.Args[1]};if mode!="demo"&&mode!="bench" {panic("demo | bench")}
 path:=os.Getenv("ORM_DB_PATH");if path=="" {if mode=="bench" {path="../../benchmark/library.db"} else {path="demo.db"}}
 path,err:=filepath.Abs(path);must(err)
 if mode=="bench" {_,err=os.Stat(path);must(err)}
 log:=logger.Silent;if mode=="demo" {log=logger.Info}
 db,err:=gorm.Open(sqlite.Open(path+"?_foreign_keys=on"),&gorm.Config{Logger:logger.Default.LogMode(log),PrepareStmt:false});must(err)
 raw,err:=db.DB();must(err);defer raw.Close();raw.SetMaxOpenConns(1)
 if mode=="demo" {demo(db)} else {bench(db,raw)}
}
