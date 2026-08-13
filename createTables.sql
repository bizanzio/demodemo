-- Crear tabla SizeSystem
CREATE TABLE IF NOT EXISTS SizeSystem (
  id INT AUTO_INCREMENT PRIMARY KEY,
  systemName VARCHAR(50) NOT NULL
);

-- Crear tabla Supplier
CREATE TABLE IF NOT EXISTS Supplier (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  originSystemId INT,
  FOREIGN KEY (originSystemId) REFERENCES SizeSystem(id)
);

-- Crear tabla Gender
CREATE TABLE IF NOT EXISTS Gender (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);

-- Crear tabla Category
CREATE TABLE IF NOT EXISTS Category (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  genderId INT,
  supplierId INT,
  FOREIGN KEY (genderId) REFERENCES Gender(id),
  FOREIGN KEY (supplierId) REFERENCES Supplier(id)
);

-- Crear tabla Size
CREATE TABLE IF NOT EXISTS Size (
  id INT AUTO_INCREMENT PRIMARY KEY,
  originalSize VARCHAR(10) NOT NULL,
  euConvertedSize VARCHAR(10) NOT NULL,
  supplierId INT,
  categoryId INT,
  sizeSystemId INT,
  FOREIGN KEY (supplierId) REFERENCES Supplier(id),
  FOREIGN KEY (categoryId) REFERENCES Category(id),
  FOREIGN KEY (sizeSystemId) REFERENCES SizeSystem(id)
); 