-- Sistemas de tallas
INSERT INTO SizeSystem (id, systemName) VALUES
  (1, 'EU'),
  (2, 'US'),
  (3, 'UK');

-- Proveedores (marcas)
INSERT INTO Supplier (id, name, originSystemId) VALUES
  (1, 'Nike', 2),
  (2, 'Adidas', 1),
  (3, 'Puma', 1);

-- Géneros
INSERT INTO Gender (id, name) VALUES
  (1, 'Hombre'),
  (2, 'Mujer'),
  (3, 'Niño');

-- Categorías (tipo de calzado por género y proveedor)
INSERT INTO Category (id, name, genderId, supplierId) VALUES
  (1, 'Zapatillas Running', 1, 1),
  (2, 'Zapatillas Running', 2, 1),
  (3, 'Zapatillas Fútbol', 1, 2),
  (4, 'Zapatillas Fútbol', 2, 2),
  (5, 'Zapatillas Casual', 1, 3);

-- Tallas (Size)
INSERT INTO Size (id, originalSize, euConvertedSize, supplierId, categoryId, sizeSystemId) VALUES
  -- Nike Hombre Running (US)
  (1, '9', '42.5', 1, 1, 2),
  (2, '10', '44', 1, 1, 2),
  -- Nike Mujer Running (US)
  (3, '7', '38', 1, 2, 2),
  (4, '8', '39', 1, 2, 2),
  -- Adidas Hombre Fútbol (EU)
  (5, '42', '42', 2, 3, 1),
  (6, '43', '43', 2, 3, 1),
  -- Adidas Mujer Fútbol (EU)
  (7, '38', '38', 2, 4, 1),
  (8, '39', '39', 2, 4, 1),
  -- Puma Hombre Casual (EU)
  (9, '41', '41', 3, 5, 1),
  (10, '42', '42', 3, 5, 1); 