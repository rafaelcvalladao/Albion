import { useState, useRef, useEffect, useMemo } from 'react';
import '../styles/NestedCategorySelector.css';

export default function NestedCategorySelector({
  categories = [],
  selectedCategory,
  onCategoryChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  // Agrupar categorias: { group -> [{ label, value }] } + specials
  // Groups that also exist as standalone category (e.g., "Armas") are selectable
  const { groups, specials } = useMemo(() => {
    const grpMap = {};
    const spc = [];
    const standalone = new Set(); // group names that exist as standalone categories
    for (const cat of categories) {
      if (cat === 'Todos') continue;
      const parts = cat.split(' - ');
      if (parts.length === 2) {
        const [group, sub] = parts;
        if (!grpMap[group]) grpMap[group] = [];
        grpMap[group].push({ label: sub, value: cat });
      } else {
        spc.push({ label: cat, value: cat });
      }
    }
    // Check which group names also exist as standalone categories
    for (const cat of categories) {
      if (grpMap[cat]) standalone.add(cat);
    }
    // Remove standalone group names from specials (they'll appear as group headers)
    const filteredSpc = spc.filter((s) => !standalone.has(s.value));
    const sorted = Object.keys(grpMap)
      .sort()
      .map((g) => ({
        name: g,
        selectable: standalone.has(g),
        items: grpMap[g].sort((a, b) => a.label.localeCompare(b.label)),
      }));
    return {
      groups: sorted,
      specials: filteredSpc.sort((a, b) => a.label.localeCompare(b.label)),
      groupSet: standalone,
    };
  }, [categories]);

  // Filtro de busca
  const searchLower = search.toLowerCase();
  const filtered = useMemo(() => {
    if (!searchLower) return null; // null = show tree view
    const results = [];
    if ('todos'.includes(searchLower)) results.push({ label: 'Todos', value: 'Todos' });
    for (const s of specials) {
      if (s.label.toLowerCase().includes(searchLower)) results.push(s);
    }
    for (const g of groups) {
      // Add group-level match if selectable
      if (g.selectable && g.name.toLowerCase().includes(searchLower)) {
        results.push({ label: `${g.name} (todos)`, value: g.name });
      }
      for (const item of g.items) {
        if (
          item.label.toLowerCase().includes(searchLower) ||
          g.name.toLowerCase().includes(searchLower)
        ) {
          results.push({ label: `${g.name} › ${item.label}`, value: item.value });
        }
      }
    }
    return results;
  }, [searchLower, groups, specials]);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Auto-focus search on open
  useEffect(() => {
    if (isOpen && searchRef.current) searchRef.current.focus();
  }, [isOpen]);

  const handleSelect = (value) => {
    onCategoryChange(value);
    setIsOpen(false);
    setSearch('');
    setExpandedGroups(new Set());
  };

  const toggleGroup = (name) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const selectedLabel = selectedCategory || 'Selecione uma categoria';

  return (
    <div className="ncs" ref={containerRef}>
      <button type="button" className="ncs-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span className="ncs-label">{selectedLabel}</span>
        <span className={`ncs-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="ncs-dropdown">
          <div className="ncs-search-wrap">
            <input
              ref={searchRef}
              type="text"
              className="ncs-search"
              placeholder="Buscar categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="ncs-search-clear" onClick={() => setSearch('')}>
                ✕
              </button>
            )}
          </div>

          <div className="ncs-list">
            {filtered ? (
              /* Modo busca: lista plana */
              filtered.length === 0 ? (
                <div className="ncs-empty">Nenhuma categoria encontrada</div>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`ncs-item ${selectedCategory === item.value ? 'active' : ''}`}
                    onClick={() => handleSelect(item.value)}
                  >
                    {item.label}
                  </button>
                ))
              )
            ) : (
              /* Modo árvore: accordion */
              <>
                {/* Todos */}
                <button
                  type="button"
                  className={`ncs-item ncs-item--todos ${selectedCategory === 'Todos' ? 'active' : ''}`}
                  onClick={() => handleSelect('Todos')}
                >
                  Todos
                </button>

                {/* Especiais */}
                {specials.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`ncs-item ${selectedCategory === item.value ? 'active' : ''}`}
                    onClick={() => handleSelect(item.value)}
                  >
                    {item.label}
                  </button>
                ))}

                {specials.length > 0 && groups.length > 0 && <div className="ncs-divider" />}

                {/* Grupos expansíveis */}
                {groups.map((group) => {
                  const isExpanded = expandedGroups.has(group.name);
                  const hasActiveChild = group.items.some((i) => i.value === selectedCategory);
                  const isGroupActive = group.selectable && selectedCategory === group.name;
                  return (
                    <div key={group.name} className="ncs-group">
                      <div
                        className={`ncs-group-header ${isExpanded ? 'expanded' : ''} ${hasActiveChild || isGroupActive ? 'has-active' : ''}`}
                      >
                        <button
                          type="button"
                          className={`ncs-group-label ${isGroupActive ? 'active' : ''}`}
                          onClick={() =>
                            group.selectable ? handleSelect(group.name) : toggleGroup(group.name)
                          }
                          title={
                            group.selectable ? `Selecionar todos de ${group.name}` : group.name
                          }
                        >
                          <span>{group.name}</span>
                          <span className="ncs-group-badge">{group.items.length}</span>
                        </button>
                        <button
                          type="button"
                          className="ncs-group-toggle"
                          onClick={() => toggleGroup(group.name)}
                          title={isExpanded ? 'Recolher' : 'Expandir subcategorias'}
                        >
                          <span className={`ncs-chevron ${isExpanded ? 'open' : ''}`}>›</span>
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="ncs-group-items">
                          {group.items.map((item) => (
                            <button
                              key={item.value}
                              type="button"
                              className={`ncs-item ncs-item--child ${selectedCategory === item.value ? 'active' : ''}`}
                              onClick={() => handleSelect(item.value)}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
