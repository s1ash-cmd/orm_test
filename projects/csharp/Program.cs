using Microsoft.EntityFrameworkCore;
using Microsoft.Data.Sqlite;
using System.Diagnostics;
using System.Text.Json;

var mode = args.FirstOrDefault() ?? "demo";
if (mode is not ("demo" or "bench")) throw new ArgumentException("demo | bench");
var path = Environment.GetEnvironmentVariable("ORM_DB_PATH") ??
    Path.GetFullPath(mode == "bench" ? "../../benchmark/library.db" : "demo.db");
if (mode == "bench" && !File.Exists(path)) throw new FileNotFoundException("Сначала python benchmark/seed.py");
using var connection = new SqliteConnection($"Data Source={path};Foreign Keys=True");
connection.Open();
var builder = new DbContextOptionsBuilder<LibraryContext>().UseSqlite(connection);
if (mode == "demo") builder.LogTo(Console.WriteLine);
var options = builder.Options;
if (mode == "demo") {
    using var db = new LibraryContext(options);
    db.Database.EnsureCreated();
    using var tx = db.Database.BeginTransaction();
    var book = new Book { Title = "ORM на практике" };
    db.Books.Add(book); db.SaveChanges();
    var loan = new Loan { BookId = book.Id };
    db.Loans.Add(loan); db.SaveChanges();
    book.Title = "ORM и SQL"; db.SaveChanges();
    db.ChangeTracker.Clear();
    var loaded = db.Books.Include(b => b.Loans).Single(b => b.Id == book.Id);
    if (loaded.Title != "ORM и SQL" || loaded.Loans.Count != 1) throw new Exception("CRUD");
    Console.WriteLine($"Book {loaded.Id}: {loaded.Title}; loans={loaded.Loans.Count}");
    db.Loans.RemoveRange(loaded.Loans); db.SaveChanges();
    db.Books.Remove(loaded); db.SaveChanges();
    if (db.Books.Any(b => b.Id == book.Id)) throw new Exception("DELETE");
    tx.Commit();
    Console.WriteLine("CRUD и связь 1:N проверены; демонстрационные записи удалены.");
} else {
    List<object[]> Orm(string kind, int start) {
        using var db = new LibraryContext(options);
        if (kind == "join") return db.Loans.AsNoTracking().Where(l => l.Id >= start)
            .OrderBy(l => l.Id).Take(100)
            .Select(l => new { l.Id, l.BookId, l.Book.Title }).ToList()
            .Select(r => new object[] {r.Id,r.BookId,r.Title}).ToList();
        var query = db.Books.AsNoTracking();
        var rows = kind == "point" ? query.Where(b => b.Id == start).ToList() :
            query.Where(b => b.Id >= start).OrderBy(b => b.Id).Take(100).ToList();
        return rows.Select(b => new object[] {b.Id,b.Title}).ToList();
    }
    List<object[]> Sql(string kind, int start) {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = kind switch {
            "point" => "SELECT id,title FROM books WHERE id=$start",
            "range" => "SELECT id,title FROM books WHERE id>=$start ORDER BY id LIMIT 100",
            _ => "SELECT l.id,l.book_id,b.title FROM loans l JOIN books b ON b.id=l.book_id WHERE l.id>=$start ORDER BY l.id LIMIT 100"
        };
        cmd.Parameters.AddWithValue("$start", start);
        using var reader = cmd.ExecuteReader();
        var result = new List<object[]>();
        while (reader.Read()) {
            if (kind == "join") result.Add([reader.GetInt32(0),reader.GetInt32(1),reader.GetString(2)]);
            else {
                var book = new Book { Id=reader.GetInt32(0), Title=reader.GetString(1) };
                result.Add([book.Id,book.Title]);
            }
        }
        return result;
    }
    var results = new List<object>();
    foreach (var kind in new[] {"point","range","join"}) {
        foreach (var start in new[] {1,2501,5001})
            if (JsonSerializer.Serialize(Orm(kind,start)) != JsonSerializer.Serialize(Sql(kind,start))) throw new Exception("Mismatch");
        for (var i=0;i<50;i++) { Orm(kind,1+i); Sql(kind,1+i); }
        var samples = new Dictionary<string,List<double>> { ["orm"]=[],["sql"]=[] };
        for (var r=0;r<7;r++) foreach (var name in r%2==0 ? new[] {"orm","sql"} : new[] {"sql","orm"}) {
            for (var i=0;i<300;i++) {
                var start = 1 + ((i*37+r*101)%9000);
                var t = Stopwatch.GetTimestamp();
                var rows = name == "orm" ? Orm(kind,start) : Sql(kind,start);
                samples[name].Add(Stopwatch.GetElapsedTime(t).TotalMicroseconds);
                if (rows.Count != (kind == "point" ? 1 : 100)) throw new Exception("Count");
            }
        }
        foreach (var (name,xs) in samples) {
            var sorted = xs.Order().ToArray();
            results.Add(new { @case=kind,method=name,median_us=(sorted[1049]+sorted[1050])/2,
                p95_us=sorted[(int)Math.Ceiling(sorted.Length*.95)-1],samples_us=xs });
        }
    }
    using var version = connection.CreateCommand();version.CommandText="select sqlite_version()";
    Console.WriteLine(JsonSerializer.Serialize(new {language="C#",orm="EF Core 10.0.14",sqlite=version.ExecuteScalar(),results}));
}

public class Book {
    public int Id {get;set;}
    public string Title {get;set;} = "";
    public List<Loan> Loans {get;set;} = [];
}
public class Loan {
    public int Id {get;set;}
    public int BookId {get;set;}
    public Book Book {get;set;} = null!;
}
public class LibraryContext(DbContextOptions<LibraryContext> options) : DbContext(options) {
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Loan> Loans => Set<Loan>();
    protected override void OnModelCreating(ModelBuilder model) {
        model.Entity<Book>().ToTable("books");
        model.Entity<Book>().Property(b=>b.Id).HasColumnName("id");
        model.Entity<Book>().Property(b=>b.Title).HasColumnName("title").IsRequired();
        model.Entity<Loan>().ToTable("loans");
        model.Entity<Loan>().Property(l=>l.Id).HasColumnName("id");
        model.Entity<Loan>().Property(l=>l.BookId).HasColumnName("book_id");
        model.Entity<Loan>().HasOne(l=>l.Book).WithMany(b=>b.Loans).HasForeignKey(l=>l.BookId).OnDelete(DeleteBehavior.Restrict);
    }
}
