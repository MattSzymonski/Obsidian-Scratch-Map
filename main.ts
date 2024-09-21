import { App, MarkdownPostProcessorContext, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import worldGeoJSON from './world.geo.json';

// Import the CSS
import './styles.css';

interface WorldMapPluginSettings {
  highlightColor: string;
}

const DEFAULT_SETTINGS: WorldMapPluginSettings = {
  highlightColor: '#2eb256', // Default highlighted color
};

export default class WorldMapPlugin extends Plugin {
  settings: WorldMapPluginSettings;

  // Store references to maps, geoJsonLayers, and countries
  maps: Array<{
    map: L.Map;
    geoJsonLayer: L.GeoJSON<any>;
    countries: string[];
  }> = [];

  async onload() {
    // Load settings
    await this.loadSettings();

    // Register the markdown code block processor
    this.registerMarkdownCodeBlockProcessor(
      'scratchmap',
      this.worldMapProcessor.bind(this)
    );

    // Add settings tab
    this.addSettingTab(new WorldMapSettingTab(this.app, this));

    // Update maps when Obsidian loads the plugin
    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        this.updateAllMaps();
      })
    );
  }

  onunload() {
    // Clear the maps array when the plugin is unloaded
    this.maps = [];
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async worldMapProcessor(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ) {
    // Parse the list of countries from the code block
    const countries = source
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Create a div to hold the map
    const mapDiv = el.createDiv();
    mapDiv.style.width = '100%';
    mapDiv.style.height = '500px';

    // Initialize the map
    const map = L.map(mapDiv).setView([20, 0], 2);

    // Add a tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // Function to style each country
    const styleFeature = (feature: any) => {
      if (countries.includes(feature.properties.name)) {
        return { color: this.settings.highlightColor, weight: 1 }; // Use highlight color from settings
      } else {
        return { color: '#e3e3e3', weight: 0 }; // Default color
      }
    };

    // Highlight the visited countries
    const geoJsonLayer = L.geoJSON(worldGeoJSON as any, {
      style: styleFeature,
    }).addTo(map);

    // Store references to the map, geoJsonLayer, and countries
    this.maps.push({ map, geoJsonLayer, countries });

    // Fix the tile loading issue
    setTimeout(() => {
      map.invalidateSize();
    }, 10);
  }

  // Method to update all maps when settings change
  updateAllMaps() {
    this.maps.forEach(({ geoJsonLayer, countries }) => {
      geoJsonLayer.setStyle((feature: any) => {
        if (countries.includes(feature.properties.name)) {
          return { color: this.settings.highlightColor, weight: 1 };
        } else {
          return { color: '#e3e3e3', weight: 0 };
        }
      });
    });
  }
}

class WorldMapSettingTab extends PluginSettingTab {
  plugin: WorldMapPlugin;

  constructor(app: App, plugin: WorldMapPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'General Settings' });

    new Setting(containerEl)
      .setName('Highlight color')
      .setDesc('Choose the color to highlight countries with')
      .addText((text) => {
        // Set the input type to 'color' to use a color picker
        text.inputEl.setAttribute('type', 'color');
        text
          .setValue(this.plugin.settings.highlightColor)
          .onChange(async (value) => {
            this.plugin.settings.highlightColor = value;
            await this.plugin.saveSettings();

            // Update all maps with the new highlight color
            this.plugin.updateAllMaps();
          });
      });
  }
}
