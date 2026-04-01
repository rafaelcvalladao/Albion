import { useState, useRef, useEffect } from "react";
import "../styles/NestedCategorySelector.css";

export default function NestedCategorySelector({ categories = [], selectedCategory, onCategoryChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const containerRef = useRef(null);

  // Agrupar categorias por prefixo (parte antes do " - ")
  const groupedCategories = categories.reduce((acc, cat) => {
    if (cat === "Todos") {
      acc.push({ group: null, label: "Todos", value: "Todos", isSpecial: true });
      return acc;
    }

    const parts = cat.split(" - ");
    if (parts.length === 2) {
      const [group, subcat] = parts;
      if (!acc.find(g => g.group === group && !g.isSpecial)) {
        acc.push({ group, label: group, value: null, isSpecial: false });
      }
      acc.push({ group, label: subcat, value: cat, isSpecial: false });
    } else {
      acc.push({ group: null, label: cat, value: cat, isSpecial: true });
    }
    return acc;
  }, []);

  const groups = [...new Set(groupedCategories
    .filter(item => item.group !== null)
    .map(item => item.group)
  )].sort();

  const subcategories = selectedGroup
    ? groupedCategories
        .filter(item => item.group === selectedGroup && item.value !== null)
        .map(item => ({ label: item.label, value: item.value }))
    : [];

  const specialCategories = groupedCategories.filter(item => item.isSpecial && item.value !== null);

  // Encontrar label do selected
  const selectedLabel = categories.find(c => c === selectedCategory) === selectedCategory 
    ? selectedCategory 
    : "Selecione uma categoria";

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectCategory = (value) => {
    onCategoryChange(value);
    setIsOpen(false);
    setSelectedGroup(null);
    setSelectedSubcategory(null);
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(selectedGroup === group ? null : group);
    setSelectedSubcategory(null);
  };

  return (
    <div className="nested-category-selector" ref={containerRef}>
      <button
        type="button"
        className="category-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="category-label">{selectedLabel}</span>
        <span className={`category-arrow ${isOpen ? "open" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="category-dropdown">
          <div className="category-content">
            {/* Coluna Esquerda: Grupos */}
            <div className="category-column">
              <div className="column-title">Categorias</div>
              
              {/* Especiais (sem grupo) */}
              {specialCategories.length > 0 && (
                <>
                  {specialCategories.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`category-item ${selectedCategory === item.value ? "active" : ""}`}
                      onClick={() => handleSelectCategory(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                  {groups.length > 0 && <div className="divider" />}
                </>
              )}

              {/* Grupos */}
              {groups.map((group) => (
                <button
                  key={group}
                  type="button"
                  className={`category-item ${selectedGroup === group ? "selected" : ""}`}
                  onClick={() => handleGroupSelect(group)}
                >
                  {group}
                  <span className={`indicator ${selectedGroup === group ? "open" : ""}`}>›</span>
                </button>
              ))}
            </div>

            {/* Coluna Direita: Subcategorias */}
            {selectedGroup && subcategories.length > 0 && (
              <div className="category-column">
                <div className="column-title">{selectedGroup}</div>
                {subcategories.map((subcat) => (
                  <button
                    key={subcat.value}
                    type="button"
                    className={`category-item ${selectedCategory === subcat.value ? "active" : ""}`}
                    onClick={() => handleSelectCategory(subcat.value)}
                  >
                    {subcat.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
