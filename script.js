///Global variables to manage drag-and-drop and state tracking
let draggedItem = null; //Currently dragged item
let sourceCell = null; //Cell from which the item is dragged
let actionHistory = []; //Stores the history of table states for undo/redo
let historyIndex = -1; //Index to track the current state in the history
let callCount = 0; //Tracks the number of times `getNextCellValue` is called


const usedColors = new Set(); //Store used colors in a Set to ensure unique random colors

const addedRows = []; //Keeps track of added rows to manage undo properly


///Initial state of the table, used for resetting
const initialState = [
  ["100", "200", "300"],
  ["400", "500", "600"],
  ["700", "800", "900"]
];

///DOM elements for interactive buttons and table
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const tableBody = document.getElementById('tableBody');
const addRowBtn = document.getElementById('addRowBtn');
const removeRowBtn = document.getElementById('removeRowBtn');
const resetBtn = document.getElementById('resetBtn');

///Creates animated elements (atoms) when the page loads
window.onload = () => {
  for (let i = 0; i < 20; i++) {
    let atom = document.createElement('div');
    atom.classList.add('atom');
    atom.style.top = `${Math.random() * 100}vh`;
    atom.style.left = `${Math.random() * 100}vw`;
    document.body.appendChild(atom);
  }
};

///Event listeners for undo/redo functionality
undoBtn.addEventListener('click', undoAction);
redoBtn.addEventListener('click', redoAction);

///Keyboard shortcuts for undo (Ctrl+Z)
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && (event.key === 'z' || event.key === 'Z')) {
    event.preventDefault(); ///Prevent default browser undo
    undoAction();
  }
});

///For redo (Ctrl+Y)
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || event.key === 'Y')) {
    event.preventDefault(); ///Prevent default browser redo
    redoAction();
  }
});

///Add row functionality
addRowBtn.addEventListener('click', () => {
  const newRow = document.createElement('tr');

  if (tableBody.children.length > 9) {
    alert("You can't add more than 10 Rows!");
  } else {
    //Create 3 new cells for the row
    for (let i = 0; i < 3; i++) {
      const newCell = document.createElement('td');
      const newDiv = document.createElement('div');
      newDiv.classList.add('draggable');
      newDiv.setAttribute('draggable', 'true');
      newDiv.textContent = getNextCellValue(); //Set unique value
      newCell.appendChild(newDiv);
      newRow.appendChild(newCell);
    }

    tableBody.appendChild(newRow);
    addedRows.push(newRow); //Track the new row
    callCount = 0; //Reset call count for unique value generation

    initializeDraggables(); //Enable drag-and-drop for new elements
    saveState(); //Save the updated state
  }
});

///Remove row functionality
removeRowBtn.addEventListener('click', () => {
  if (tableBody.children.length > 3) { //Ensure at least 3 rows remain
    tableBody.removeChild(tableBody.lastChild);
    saveState(); //Save the updated state
  } else {
    alert("You can't remove the initial 3 rows!");
  }
});

///Reset the table to its initial state
resetBtn.addEventListener('click', () => {
  tableBody.innerHTML = ''; //Clear current table rows

  //Rebuild the table using the initial state
  initialState.forEach(rowData => {
    const newRow = document.createElement('tr');
    rowData.forEach(cellData => {
      const newCell = document.createElement('td');
      const newDiv = document.createElement('div');
      newDiv.classList.add('draggable');
      newDiv.setAttribute('draggable', 'true');
      newDiv.textContent = cellData;
      newCell.appendChild(newDiv);
      newRow.appendChild(newCell);
    });
    tableBody.appendChild(newRow);
  });

  initializeDraggables(); //Re-enable drag-and-drop
  saveState(); //Save the reset state
});

///Generate a unique random color, avoiding white
function getRandomColor() {
  let color;
  let isUnique = false;

  while (!isUnique) {
    const hue = Math.floor(Math.random() * 360); //Random hue
    const saturation = 80 + Math.floor(Math.random() * 20); //Saturation 80-100%
    const lightness = 30 + Math.floor(Math.random() * 30); //Lightness 30-60%

    color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

    if (!usedColors.has(color) && lightness !== 100) {
      isUnique = true;
      usedColors.add(color); //Mark as used
    }
  }

  return color;
}

///Initialize drag-and-drop for table items
function initializeDraggables() {
  document.querySelectorAll('.draggable').forEach(item => {
    if (!item.dataset.color) {
      const randomColor = getRandomColor();
      item.dataset.color = randomColor;
      item.style.backgroundColor = randomColor;
    } else {
      item.style.backgroundColor = item.dataset.color; //Restore original color
    }

    item.removeEventListener('dragstart', dragStart);
    item.removeEventListener('dragend', dragEnd);

    item.addEventListener('dragstart', dragStart);
    item.addEventListener('dragend', dragEnd);
  });

  document.querySelectorAll('td').forEach(cell => {
    cell.removeEventListener('dragover', dragOver);
    cell.removeEventListener('drop', drop);

    cell.addEventListener('dragover', dragOver);
    cell.addEventListener('drop', drop);
  });
}

///Allow dropping by preventing default behavior
function dragOver(event) {
  event.preventDefault();
}

///Handle the drop event to swap or move items
function drop(event) {
  event.preventDefault();
  const targetCell = event.target.tagName === 'TD' ? event.target : event.target.closest('td');

  if (targetCell && draggedItem) {
    const targetDiv = targetCell.querySelector('.draggable');
    if (targetDiv) {
      sourceCell.appendChild(targetDiv); //Swap items
    }
    targetCell.appendChild(draggedItem); //Move dragged item
  }
}

///Start dragging
function dragStart(event) {
  draggedItem = event.target;
  sourceCell = event.target.parentElement; //Record source cell
}

///End dragging and save state
function dragEnd() {
  saveState(); //Save the new state
  draggedItem = null;
  sourceCell = null;
}

///Save the current state of the table
function saveState() {
  if (historyIndex < actionHistory.length - 1) {
    actionHistory = actionHistory.slice(0, historyIndex + 1); //Remove forward history
  }

  const currentState = Array.from(document.querySelectorAll('td')).map(cell => cell.innerHTML);
  actionHistory.push(currentState);
  historyIndex++;

  undoBtn.disabled = historyIndex === 0; //Enable/disable undo
  redoBtn.disabled = historyIndex === actionHistory.length - 1; //Enable/disable redo
}

///Undo the last action
function undoAction() {
  if (historyIndex > 0) {
    historyIndex--;
    const prevState = actionHistory[historyIndex];

    document.querySelectorAll('td').forEach((cell, index) => {
      cell.innerHTML = prevState[index];
    });

    if (addedRows.length > 0) {
      tableBody.removeChild(addedRows.pop()); //Remove last added row
    }

    initializeDraggables(); //Re-enable drag-and-drop

    undoBtn.disabled = historyIndex === 0;
    redoBtn.disabled = false;
  }
}

///Redo the next action
function redoAction() {
  if (historyIndex < actionHistory.length - 1) {
    historyIndex++;
    const nextState = actionHistory[historyIndex];

    document.querySelectorAll('td').forEach((cell, index) => {
      cell.innerHTML = nextState[index];
    });

    initializeDraggables(); //Re-enable drag-and-drop

    redoBtn.disabled = historyIndex === actionHistory.length - 1;
    undoBtn.disabled = false;
  }
}

///Generate the next unique cell value
function getNextCellValue() {
  const allValues = Array.from(document.querySelectorAll('table td')).map(cell => parseInt(cell.textContent, 10));
  const maxValue = Math.max(...allValues, 0); //Get current max value
  callCount++;
  const increment = callCount * 100; //Increment by 100 per call
  return maxValue + increment;
}

///Initialize state and drag-and-drop on page load
saveState();
initializeDraggables();
