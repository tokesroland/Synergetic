# Synergetic – index.html módosítási útmutató

A backend (`EntryController.php`) és a `js/components/*.js` fájlok teljes cserével mennek.
Az `index.html`-ben **három** részleges módosítást kell elvégezni a meglévő `<script type="text/x-template">` blokkokban. Pontosan ezek:

---


## 2) tpl-calendar-view → HETI nézet (`<div v-if="view==='week'" class="wv">` blokk cseréje)

Keresd meg a `tpl-calendar-view` script blokkban a HETI szakaszt – jelenleg ez:

```html
              <!-- HETI - + gomb jobb alsó sarok -->
              <div v-if="view==='week'" class="wv">
                  <div class="wv-grid">
                      <div v-for="day in weekDays" :key="day.dayNum" class="wv-day-col" :class="{ today:day.isToday }">
                          <div class="wv-day-header"><span class="wv-day-name">{{ day.dayName }}</span><span class="wv-day-num">{{ day.dayNum }}</span></div>
                          <div class="wv-entries">
                              <div v-for="entry in day.entries" :key="entry.id" class="wv-entry" :style="{ borderLeftColor:col(entry.type) }" @click="goToEntry(entry)">
                                  <span class="wv-entry-title">{{ entry.title }}</span><span class="wv-entry-time">{{ fmtTime(entry.start_datetime) }}</span>
                              </div>
                          </div>
                          <button class="wv-add-btn" @click="addEntryForDate(day.date)" title="Új entry ehhez a naphoz">+</button>
                      </div>
                  </div>
              </div>
```

Cseréld le **az alábbira** (a `wv-add-btn` immár a saját napra nyit quick-add formot, a `wv-entry-time` pedig `wvEntryTimeLabel`-t használ, hogy todo esetén is értelmes időt mutasson):

```html
              <!-- HETI - + gomb jobb alsó sarok, csak Event/Todo gyors hozzáadással -->
              <div v-if="view==='week'" class="wv">
                  <div class="wv-grid">
                      <div v-for="day in weekDays" :key="day.dayNum" class="wv-day-col" :class="{ today:day.isToday }">
                          <div class="wv-day-header">
                              <span class="wv-day-name">{{ day.dayName }}</span>
                              <span class="wv-day-num">{{ day.dayNum }}</span>
                          </div>
                          <div class="wv-entries">
                              <div v-for="entry in day.entries" :key="entry.id"
                                   class="wv-entry"
                                   :style="{ borderLeftColor:col(entry.type) }"
                                   @click="goToEntry(entry)">
                                  <span class="wv-entry-title">{{ entry.title }}</span>
                                  <span class="wv-entry-time">{{ wvEntryTimeLabel(entry) }}</span>
                              </div>
                          </div>

                          <!-- Inline quick-add popup CSAK Event/Todo választással, az adott napra -->
                          <div v-if="quickAddOpen && quickAddWeekDay && sameDay(quickAddWeekDay, day.date)"
                               class="wv-quick-add-form"
                               @click.stop>
                              <div class="wv-quick-add-row">
                                  <input ref="weekQuickAddInput"
                                         v-model="quickAddTitle"
                                         class="wv-quick-add-input"
                                         placeholder="Bejegyzés neve..."
                                         @keydown.enter="submitQuickAdd"
                                         @keydown.esc="closeQuickAdd" />
                              </div>
                              <div class="wv-quick-add-row">
                                  <div class="wv-quick-add-types">
                                      <button v-for="t in quickAddTypes" :key="t.value"
                                              class="wv-quick-add-type-btn"
                                              :class="{ active: quickAddType === t.value }"
                                              :style="quickAddType === t.value ? { borderColor: col(t.value), color: col(t.value), background: col(t.value)+'18' } : {}"
                                              @click="quickAddType = t.value">{{ t.label }}</button>
                                  </div>
                              </div>
                              <div v-if="quickAddType === 'event'" class="wv-quick-add-row">
                                  <input type="datetime-local" class="wv-quick-add-dt" v-model="quickAddStart" />
                                  <span class="wv-quick-add-sep">–</span>
                                  <input type="datetime-local" class="wv-quick-add-dt" v-model="quickAddEnd" />
                              </div>
                              <div v-if="quickAddType === 'todo'" class="wv-quick-add-row">
                                  <input type="datetime-local" class="wv-quick-add-dt" v-model="quickAddStart" />
                                  <span class="wv-quick-add-sep">–</span>
                                  <input type="datetime-local" class="wv-quick-add-dt" v-model="quickAddDeadline" />
                              </div>
                              <div class="wv-quick-add-row wv-quick-add-actions">
                                  <div v-if="quickAddError" class="wv-quick-add-error">{{ quickAddError }}</div>
                                  <button class="wv-quick-add-cancel" @click="closeQuickAdd">Mégse</button>
                                  <button class="wv-quick-add-submit" @click="submitQuickAdd" :disabled="quickAddSaving">
                                      {{ quickAddSaving ? 'Mentés...' : 'Létrehozás' }}
                                  </button>
                              </div>
                          </div>

                          <button class="wv-add-btn"
                                  @click.stop="addEntryForDate(day.date)"
                                  title="Új Event/Todo ehhez a naphoz">+</button>
                      </div>
                  </div>
              </div>
```

> **Megjegyzés:** A nézet váltáskor a `setView()` automatikusan bezárja a quick-add formot, így nem marad nyitva tévesen.

---

## 3) tpl-omnibar → Bal oldali menü panelek (CSOPORTOK és ISMÉTLŐDÉS törlése)

Keresd meg a `tpl-omnibar` script blokkban ezt a két `<div v-if="activeView === '...'">` szakaszt és **töröld őket teljesen**:

```html
                          <!-- CSOPORTOK -->
                          <div v-if="activeView === 'groups'">
                              <h4 class="omnibar-view-title">Csoportok (Több is választható)</h4>
                              <input type="text" v-model="groupSearch" placeholder="Csoport keresése..." class="omnibar-mini-search">
                              <div class="omnibar-checkbox-list">
                                  <label v-for="group in filteredGroups" :key="group.id" class="omnibar-checkbox-item">
                                      <input type="checkbox" :checked="selectedGroupIds.includes(group.id)" @change="toggleGroup(group.id)">
                                      <span :style="{ color: group.color_hex || 'var(--text-primary)' }">{{ group.name }}</span>
                                      <span class="omnibar-group-stats">{{ group.todo_count||0 }}F | {{ group.event_count||0 }}E | {{ group.note_count||0 }}J</span>
                                  </label>
                              </div>
                              <button v-if="selectedGroupIds.length" class="omnibar-apply-btn" @click="applyGroups">Kiválasztottak hozzáadása ({{ selectedGroupIds.length }})</button>
                          </div>

                          <!-- ISMÉTLŐDÉS -->
                          <div v-if="activeView === 'recurrence'">
                              <h4 class="omnibar-view-title">Ismétlődés</h4>
                              <div class="omnibar-dev-notice"><span class="dev-icon">🚧</span><span>Ez a funkció fejlesztés alatt áll.</span></div>
                          </div>
```

A két blokkot tartalmazó konténer **többi részét hagyd érintetlenül**. A bal menüből (`menuItems`) az új `OmniBar.js` már nem listázza ezeket az opciókat, így a kattintható menüpontok is eltűnnek.

---

## 4) tpl-details-view → BADGE ROW kibővítése Helyszín csatolóval (Event esetén)

Keresd meg a `tpl-details-view` script blokkban a `badge-row` divet – jelenleg:

```html
                        <div class="badge-row">
                            <span class="type-badge" :style="{ backgroundColor:typeColor }">{{ typeName }}</span>
                            <span v-if="currentCatId&&currentCatName" class="category-badge" :style="{ backgroundColor:currentCatColor||'#5c6bc0' }" @click="openCatPicker">📁 {{ currentCatName }}</span>
                            <button v-else class="add-category-btn" @click="openCatPicker">+ Kategória</button>
                            <span v-for="tag in currentTags" :key="tag.id" class="tag-badge"><span class="tag-dot" :style="{ background:tag.color_hex||'#888' }"></span>{{ tag.name }}<button class="tag-remove" @click="removeTag(tag.id)">×</button></span>
                            <button class="add-tag-btn" @click="openTagPicker">+ Tag</button>
                        </div>
```

Cseréld le **az alábbira** (event-nél az "Esemény" típus-címke MELLETT megjelenik a helyszín):

```html
                        <div class="badge-row">
                            <span class="type-badge" :style="{ backgroundColor:typeColor }">{{ typeName }}</span>

                            <!-- ÚJ: Helyszín csatoló — CSAK event-nél, közvetlenül az Esemény badge mellett -->
                            <template v-if="isEvent">
                                <span v-if="currentLocId && currentLocName"
                                      class="location-badge"
                                      @click="openLocPicker"
                                      title="Helyszín módosítása">📍 {{ currentLocName }}</span>
                                <button v-else
                                        class="add-location-btn"
                                        @click="openLocPicker">+ Helyszín</button>
                            </template>

                            <span v-if="currentCatId&&currentCatName"
                                  class="category-badge"
                                  :style="{ backgroundColor:currentCatColor||'#5c6bc0' }"
                                  @click="openCatPicker">📁 {{ currentCatName }}</span>
                            <button v-else class="add-category-btn" @click="openCatPicker">+ Kategória</button>

                            <span v-for="tag in currentTags" :key="tag.id" class="tag-badge">
                                <span class="tag-dot" :style="{ background:tag.color_hex||'#888' }"></span>{{ tag.name }}<button class="tag-remove" @click="removeTag(tag.id)">×</button>
                            </span>
                            <button class="add-tag-btn" @click="openTagPicker">+ Tag</button>
                        </div>
```

---

## 5) tpl-details-view → Picker popup címke szövegei (loc módban is működjön)

Keresd meg a picker-popup belsejét a `tpl-details-view`-ban. A jelenlegi (egyszerűsített) sablon body-jában szerepel egy gomb: `{{ pickerOpen==='cat'?'kategória':'tag' }}` és egy ternary a kattintás-kezelésnél: `pickerOpen==='cat'?selectCategory(item):selectTag(item)`. Ezeket ki kell egészíteni a `loc` módra is.

A `tpl-details-view` belső picker részében keresd meg ezt a részletet (a többi sor is hasonló környezetben van):

```html
                            <div class="picker-list">
                                <div v-for="item in filteredPickerItems" :key="item.id" class="picker-item" @click="pickerOpen==='cat'?selectCategory(item):selectTag(item)">
                                    <span class="picker-dot" :style="{ background:item.color_hex||'#888' }"></span>{{ item.name }}
                                </div>
                                <div v-if="!filteredPickerItems.length" class="picker-empty">Nincs találat</div>
                            </div>
```

Cseréld le a tartalmazó `picker-list` divet úgy, hogy a `loc` esetet is kezelje:

```html
                            <div class="picker-list">
                                <div v-for="item in filteredPickerItems" :key="item.id" class="picker-item"
                                     @click="pickerOpen==='cat' ? selectCategory(item) : (pickerOpen==='loc' ? selectLocation(item) : selectTag(item))">
                                    <span class="picker-dot" :style="{ background: item.color_hex || (pickerOpen==='loc' ? '#ef4444' : '#888') }"></span>{{ item.name }}
                                </div>
                                <div v-if="!filteredPickerItems.length" class="picker-empty">Nincs találat</div>

                                <!-- ÚJ: helyszín pickerben gomb a beállított helyszín törlésére -->
                                <div v-if="pickerOpen==='loc' && currentLocId"
                                     class="picker-item"
                                     style="border-top:1px solid var(--border-color); color:#f87171;"
                                     @click="clearLocation">
                                    🗑️ Helyszín törlése
                                </div>
                            </div>
```

Ha a picker valahol megjelenít egy "Új létrehozás" jellegű gombot, ahol `pickerOpen==='cat'?'kategória':'tag'` szerepel, azt is cseréld le erre:

```html
{{ pickerOpen==='cat' ? 'kategória' : (pickerOpen==='loc' ? 'helyszín' : 'tag') }}
```

Ennyi! A `DetailsView.js` `pickerKindLabel` computed-ja is használható erre, ha könnyebben akarsz hivatkozni rá (`{{ pickerKindLabel }}`).

---

## Backend újraindítás után

Mivel a `EntryController.php` cserélve van, a Docker konténert nem kell újraindítani (a PHP fájlokat futás közben olvassa Apache), csak frissítsd az oldalt böngészőben (Ctrl+F5 a cache megkerüléséhez).
