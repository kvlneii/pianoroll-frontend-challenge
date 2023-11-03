import PianoRoll from './pianoroll.js';

const pianoRollMain = document.getElementById('piano-roll__main');
const pianoRollSidebar = document.getElementById('piano-roll__grid');

class PianoRollDisplay {
  constructor(csvURL) {
    this.csvURL = csvURL;
    this.data = null;
    this.startSelectionPoint = null;
    this.endSelectionPoint = null;
    this.isSelecting = false;
    this.isSelectingMobile = false;
  }

  async loadPianoRollData() {
    try {
      const response = await fetch('https://pianoroll.ai/random_notes');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      this.data = await response.json();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  // Handles various selection events including mouse and touch events
  handleSelectionEvent(event, svg) {
    if (
      event.type === 'mousedown' || // Mouse button pressed
      (event.type === 'touchstart' && event.touches.length > 0) // Touchscreen touched
    ) {
      // Set the flag to indicate a mobile touch event if applicable
      this.isSelectingMobile = event.type === 'touchstart';

      // Start the selection process
      this.startSelection(event, svg);
    } else if (event.type === 'mousemove' || event.type === 'touchmove') {
      // Continue drawing the selection
      this.drawSelection(event, svg);
    } else if (
      event.type === 'mouseup' || // Mouse button released
      (event.type === 'touchend' && !event.touches.length) // Touch event ended
    ) {
      // End the selection process and clear the mobile touch flag
      this.endSelection(event, svg);
      this.isSelectingMobile = false;
    }
  }

  // Initiates the selection process and clears any existing selection state
  startSelection(event, svg) {
    // Clear the current selection state
    this.clearSelectionState();
    // Start a new selection
    this.isSelecting = true;

    // Get the mouse position when the selection begins
    const clickedPos = this.getMousePosition(event, svg);
    this.startSelectionPoint = clickedPos;
  }

  // Main function to handle the drawing of the selection rectangle and updating selected notes
  drawSelection(event, svg) {
    if (!this.isSelecting) return;

    const svgPos = svg.getBoundingClientRect();
    const currentPos = this.getMousePosition(event, svg);
    const [minX, maxX] = [this.startSelectionPoint.x, currentPos.x].sort(
      (a, b) => a - b
    );
    const [minY, maxY] = [this.startSelectionPoint.y, currentPos.y].sort(
      (a, b) => a - b
    );
    const selectionX = minX / svgPos.width;
    const selectionY = minY / svgPos.height;
    const selectionWidth = (maxX - minX) / svgPos.width;
    const selectionHeight = (maxY - minY) / svgPos.height;

    this.drawSelectionRect(
      svg,
      selectionX,
      selectionY,
      selectionWidth,
      selectionHeight
    );
    this.updateSelectionInfo(
      selectionX,
      selectionY,
      selectionWidth,
      selectionHeight
    );
    this.selectNotes(
      svg,
      selectionX,
      selectionY,
      selectionWidth,
      selectionHeight
    );
  }

  // Ends the selection process and updates the selection information
  endSelection(event, svg) {
    // If not actively selecting, do nothing and return
    if (!this.isSelecting) return;

    // Finish the selection process
    this.isSelecting = false;

    // If it's a mobile touch event and no touches are active, return
    if (this.isSelectingMobile && !event.touches[0]) return;

    // Get the mouse position where the selection ended
    const clickedPos = this.getMousePosition(event, svg);
    this.endSelectionPoint = clickedPos;

    // Count the number of selected notes within the selection
    const selectionInfo = document.getElementById('selection-info');
    const selectedNotes = this.countSelectedNotes();
    selectionInfo.innerText += `\nSelected Notes: ${selectedNotes}`;

    // Update the selection information with starting and ending positions
    selectionInfo.innerText += `\nThe start point of the selection: x: ${this.startSelectionPoint.x.toFixed(
      5
    )}, y: ${this.startSelectionPoint.y.toFixed(
      5
    )}\nThe end point of the selection: x: ${this.endSelectionPoint.x.toFixed(
      5
    )}, y: ${this.endSelectionPoint.y.toFixed(5)}`;
  }

  // Handle the drawing of the selection rectangle
  drawSelectionRect(
    svg,
    selectionX,
    selectionY,
    selectionWidth,
    selectionHeight
  ) {
    let selectionRectElement =
      document.getElementById('selection') ||
      document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    selectionRectElement.id = 'selection';

    selectionRectElement.setAttribute('id', 'selection');
    selectionRectElement.setAttribute('fill', 'rgba(219, 39, 119, 0.21)');
    selectionRectElement.setAttribute('x', selectionX);
    selectionRectElement.setAttribute('y', selectionY);
    selectionRectElement.setAttribute('width', selectionWidth);
    selectionRectElement.setAttribute('height', selectionHeight);
    svg.appendChild(selectionRectElement);
  }

  // Update the selection information displayed to the user
  updateSelectionInfo(selectionX, selectionY, selectionWidth, selectionHeight) {
    const selectionInfo = document.getElementById('selection-info');
    selectionInfo.innerText = `Selection: x: ${selectionX.toFixed(
      3
    )}, y: ${selectionY.toFixed(3)}, \nHeight: ${selectionHeight.toFixed(
      2
    )}, Width: ${selectionWidth.toFixed(2)}`;
  }

  // Handle the selection of notes
  selectNotes(svg, selectionX, selectionY, selectionWidth, selectionHeight) {
    this.clearNotesFill();

    const notes = Array.from(svg.children).filter((e) =>
      e.classList.contains('note-rectangle')
    );

    notes.forEach((note) => {
      const x = note.x.baseVal.value;
      const y = note.y.baseVal.value;
      const width = note.width.baseVal.value;
      const height = note.height.baseVal.value;

      if (
        this.isRectangleInSelection(
          x,
          y,
          x + width,
          y + height,
          selectionX,
          selectionY,
          selectionX + selectionWidth,
          selectionY + selectionHeight
        )
      ) {
        note.setAttribute('data-original-fill', note.getAttribute('fill'));
        note.classList.add('selected');
        note.setAttribute('fill', '#9f1239');
      }
    });
  }

  // Get the mouse/touch position relative to an SVG element
  getMousePosition(event, svg) {
    // Determine the correct event properties based on mobile or desktop
    const { clientX, clientY } = this.isSelectingMobile
      ? event.touches[0]
      : event;

    // Get the position of the SVG element relative to the viewport
    const svgRect = svg.getBoundingClientRect();

    // Calculate the x and y coordinates of the mouse/touch position
    const x = Math.max(clientX - svgRect.left, 0);
    const y = Math.max(clientY - svgRect.top, 0);

    return { x, y };
  }

  setMainPiano(rollId) {
    // Clear the content of the main piano roll container and set sidebar
    pianoRollMain.innerHTML = '';
    pianoRollSidebar.classList.add('closed');

    // Find and deactivate the previously active roll
    const previousActiveRoll = document.querySelector(
      '.piano-roll__card.active'
    );
    if (previousActiveRoll) {
      previousActiveRoll.classList.remove('active');
    }

    // Get the selected piano roll and activate it
    const selectedRoll = pianoRollSidebar.children[rollId];
    selectedRoll.classList.add('active');

    // Clone the selected roll with its attributes and content
    const mainRoll = selectedRoll.cloneNode(true);
    mainRoll.classList.add('main');

    // Set the height and make it draggable
    const mainSvg = mainRoll.querySelector('svg');
    mainSvg.setAttribute('draggable', true);
    mainSvg.setAttribute('height', 300);

    const selectionInfo = document.createElement('div');
    selectionInfo.id = 'selection-info';
    mainRoll.appendChild(selectionInfo);

    // Attach selection events to the SVG element
    const events = [
      'mousedown',
      'mousemove',
      'mouseup',
      'touchstart',
      'touchmove',
      'touchend',
    ];
    events.forEach((eventType) => {
      mainSvg.addEventListener(eventType, (e) =>
        this.handleSelectionEvent(e, mainSvg)
      );
    });

    // Append the main piano roll to the main container and make it visible
    pianoRollMain.appendChild(mainRoll);
    pianoRollMain.classList.add('show');
  }

  // Count the number of selected notes within the selection
  countSelectedNotes() {
    const mainSvg = document.querySelector('.main > svg');
    const selectedNotes = Array.from(mainSvg.children).filter((element) =>
      element.classList.contains('selected')
    );

    return selectedNotes.length;
  }

  // Resets the state and data of the selection on the piano roll
  clearSelectionState() {
    // Reset the starting and ending selection positions
    this.startSelectionPoint = null;
    this.endSelectionPoint = null;

    // Reset flags and note colors
    this.isSelecting = false;
    this.isSelectingMobile = false;
    this.clearNotesFill();

    // Remove elements related to the selection
    const selection = document.getElementById('selection');
    if (selection) selection.remove();

    const selectionInfo = document.getElementById('selection-info');
    if (selectionInfo) selectionInfo.innerText = '';
  }

  // Reset the colors of selected notes to their original colors
  clearNotesFill() {
    // Find the SVG element within the main container
    const mainSvg = document.querySelector('.main > svg');

    // Filter and select only the notes that were previously selected
    const selectedNotes = Array.from(mainSvg.children).filter((element) =>
      element.classList.contains('selected')
    );

    // Restore the original fill colors of the selected notes
    selectedNotes.forEach((note) => {
      // Retrieve the original fill color from the data attribute
      const originalFillColor = note.getAttribute('data-original-fill');
      note.setAttribute('fill', originalFillColor);
      // Remove the data attribute to clean up
      note.removeAttribute('data-original-fill');
      // Remove the 'selected' class
      note.classList.remove('selected');
    });
  }

  // Check if a rectangle defined by its position (x, y), dimensions (width, height),
  // and a selection box (selectionX, selectionY, selectionWidth, selectionHeight) overlaps
  isRectangleInSelection(
    x,
    y,
    width,
    height,
    selectionX,
    selectionY,
    selectionWidth,
    selectionHeight
  ) {
    return (
      x < selectionWidth &&
      width > selectionX &&
      y < selectionHeight &&
      height > selectionY
    );
  }

  preparePianoRollCard(rollId) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('piano-roll__card');

    const descriptionDiv = document.createElement('div');
    descriptionDiv.classList.add('piano-roll__description');
    descriptionDiv.textContent = `This is a piano roll number ${rollId}`;
    cardDiv.appendChild(descriptionDiv);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('piano-roll__svg');
    svg.setAttribute('width', '80%');
    svg.setAttribute('height', '150');

    cardDiv.addEventListener('click', () => {
      this.setMainPiano(rollId);
      this.clearSelectionState();
    });
    cardDiv.appendChild(svg);

    return { cardDiv, svg };
  }

  async generateSVGs() {
    if (!this.data) await this.loadPianoRollData();
    if (!this.data) return;

    pianoRollSidebar.innerHTML = '';
    for (let it = 0; it < 20; it++) {
      const start = it * 60;
      const end = start + 60;
      const partData = this.data.slice(start, end);

      const { cardDiv, svg } = this.preparePianoRollCard(it);

      pianoRollSidebar.appendChild(cardDiv);
      const roll = new PianoRoll(svg, partData);
    }
  }
}

document.getElementById('loadCSV').addEventListener('click', async () => {
  const csvToSVG = new PianoRollDisplay();
  await csvToSVG.generateSVGs();
});
