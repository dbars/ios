import SwiftUI
import UniformTypeIdentifiers

private struct SavedContent: Codable, Identifiable {
    var id = UUID()
    var title: String
    var url: String
    var theme: String
    var note: String
    var savedAt = Date()
}

private enum LibraryError: LocalizedError {
    case invalidURL, duplicateURL, unsupportedExport
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Ajoutez un lien Instagram valide (instagram.com ou instagr.am)."
        case .duplicateURL: return "Ce lien existe déjà dans votre bibliothèque. Modifiez le contenu existant."
        case .unsupportedExport: return "Aucun contenu enregistré reconnu. Choisissez le fichier JSON des publications enregistrées de votre export Instagram."
        }
    }
}

private func instagramURL(_ input: String) -> String? {
    let value = input.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !value.isEmpty,
          var parts = URLComponents(string: value.contains("://") ? value : "https://\(value)"),
          let host = parts.host?.lowercased(),
          ["instagram.com", "www.instagram.com", "instagr.am", "www.instagr.am"].contains(host),
          ["https", "http"].contains(parts.scheme?.lowercased() ?? ""),
          parts.user == nil, parts.password == nil, parts.port == nil,
          !parts.path.isEmpty, parts.path != "/" else { return nil }
    parts.scheme = "https"
    parts.host = host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
    parts.query = nil
    parts.fragment = nil
    if !parts.path.hasSuffix("/") { parts.path += "/" }
    return parts.url?.absoluteString
}

private final class ContentLibrary: ObservableObject {
    @Published private(set) var items: [SavedContent] = []
    @Published var storageWarning: String?
    private let key = "instagram-content-library-v1"
    private var canPersist = true
    private let defaultThemes = ["À classer", "Voyage", "Cuisine", "Décoration", "Sport", "Inspiration"]
    var themes: [String] {
        defaultThemes + Set(items.map(\.theme)).subtracting(defaultThemes).sorted()
    }
    init() {
        guard let data = UserDefaults.standard.data(forKey: key) else { return }
        do { items = try JSONDecoder().decode([SavedContent].self, from: data) }
        catch {
            canPersist = false
            storageWarning = "La bibliothèque enregistrée est illisible. Elle a été préservée ; les nouvelles modifications ne seront pas sauvegardées."
        }
    }
    func save(_ item: SavedContent) throws {
        guard let normalized = instagramURL(item.url) else { throw LibraryError.invalidURL }
        guard !items.contains(where: { $0.url == normalized && $0.id != item.id }) else { throw LibraryError.duplicateURL }
        var content = item
        content.url = normalized
        content.title = content.title.trimmingCharacters(in: .whitespacesAndNewlines)
        if content.title.isEmpty { content.title = "Publication Instagram" }
        content.theme = content.theme.trimmingCharacters(in: .whitespacesAndNewlines)
        if content.theme.isEmpty { content.theme = "À classer" }
        if let index = items.firstIndex(where: { $0.id == item.id }) {
            items[index] = content
        } else { items.insert(content, at: 0) }
        persist()
    }
    func delete(_ item: SavedContent) {
        items.removeAll { $0.id == item.id }
        persist()
    }
    func importJSON(_ data: Data) throws -> Int {
        let json = try JSONSerialization.jsonObject(with: data)
        let rows: [[String: Any]]
        if let root = json as? [String: Any] {
            rows = (root["saved_saved_media"] as? [[String: Any]]) ?? (root["saved_posts"] as? [[String: Any]]) ?? []
        } else { rows = json as? [[String: Any]] ?? [] }
        var recognized = 0
        var imported = 0
        var urls = Set(items.map(\.url))
        for row in rows {
            let map = row["string_map_data"] as? [String: [String: Any]] ?? [:]
            let saved = map["Saved on"] ?? [:]
            let links = row["string_list_data"] as? [[String: Any]] ?? []
            let link = (saved["href"] as? String) ?? (links.first?["href"] as? String)
            guard let raw = link, let url = instagramURL(raw) else { continue }
            recognized += 1
            guard urls.insert(url).inserted else { continue }
            let title = (map["Title"]?["value"] as? String) ?? (row["title"] as? String) ?? "Publication Instagram"
            let timestamp = (saved["timestamp"] as? NSNumber) ?? (links.first?["timestamp"] as? NSNumber)
            var content = SavedContent(title: title.isEmpty ? "Publication Instagram" : title, url: url, theme: "À classer", note: "")
            if let timestamp, timestamp.doubleValue.isFinite,
               timestamp.doubleValue > 0, timestamp.doubleValue < 32_503_680_000 {
                content.savedAt = Date(timeIntervalSince1970: timestamp.doubleValue)
            }
            items.append(content)
            imported += 1
        }
        guard recognized > 0 else { throw LibraryError.unsupportedExport }
        items.sort { $0.savedAt > $1.savedAt }
        persist()
        return imported
    }
    private func persist() {
        guard canPersist else { return }
        do { UserDefaults.standard.set(try JSONEncoder().encode(items), forKey: key) }
        catch { storageWarning = "La sauvegarde locale a échoué : \(error.localizedDescription)" }
    }
}

struct ContentView: View {
    @StateObject private var library = ContentLibrary()
    @State private var search = ""
    @State private var selectedTheme: String?
    @State private var showingAdd = false
    @State private var showingImport = false
    @State private var editing: SavedContent?
    @State private var message: String?
    private var visibleItems: [SavedContent] {
        library.items.filter { item in
            (selectedTheme == nil || item.theme == selectedTheme) &&
            (search.isEmpty || "\(item.title) \(item.theme) \(item.note) \(item.url)".localizedStandardContains(search))
        }
    }
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Vos idées, bien rangées.").font(.title2.bold())
                    Text("\(library.items.count) contenu(s) · conservés sur cet appareil")
                        .font(.subheadline).foregroundStyle(.secondary)
                }.frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal).padding(.top, 12)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        themeButton("Tous", theme: nil)
                        ForEach(library.themes, id: \.self) { theme in themeButton(theme, theme: theme) }
                    }.padding()
                }
                if visibleItems.isEmpty {
                    ContentUnavailableView {
                        Label(library.items.isEmpty ? "Votre collection commence ici" : "Aucun résultat", systemImage: "bookmark")
                    } description: {
                        Text(library.items.isEmpty
                             ? "Importez vos contenus enregistrés au format JSON, puis classez-les selon vos envies."
                             : "Essayez un autre thème ou une autre recherche.")
                    } actions: {
                        if library.items.isEmpty {
                            Button("Importer mon export Instagram", systemImage: "square.and.arrow.down") { showingImport = true }
                                .buttonStyle(.borderedProminent)
                            Button("Ajouter un lien") { showingAdd = true }
                        } else {
                            Button("Afficher tous les contenus") { selectedTheme = nil; search = "" }
                        }
                    }
                } else {
                    List {
                        ForEach(visibleItems) { item in
                            VStack(alignment: .leading, spacing: 10) {
                                HStack(alignment: .top, spacing: 12) {
                                    Image(systemName: "bookmark.fill").foregroundStyle(.purple)
                                        .frame(width: 42, height: 42)
                                        .background(Color.purple.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(item.title).font(.headline)
                                        Text(item.theme).font(.caption).foregroundStyle(.purple)
                                    }
                                    Spacer(minLength: 0)
                                }
                                if !item.note.isEmpty {
                                    Text(item.note).font(.subheadline).foregroundStyle(.secondary).lineLimit(3)
                                }
                                HStack {
                                    if let url = URL(string: item.url) {
                                        Link(destination: url) { Label("Voir sur Instagram", systemImage: "arrow.up.right") }
                                            .buttonStyle(.borderless)
                                    }
                                    Spacer()
                                    Button { editing = item } label: { Image(systemName: "pencil") }
                                        .buttonStyle(.borderless).accessibilityLabel("Modifier \(item.title)")
                                }.font(.subheadline)
                            }.padding(.vertical, 8)
                                .swipeActions { Button("Supprimer", role: .destructive) { library.delete(item) } }
                        }
                    }.listStyle(.plain)
                }
            }
            .navigationTitle("Collections")
            .searchable(text: $search, prompt: "Titre, thème ou note")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Importer un fichier JSON", systemImage: "square.and.arrow.down") { showingImport = true }
                        Button("Ajouter un lien", systemImage: "plus") { showingAdd = true }
                    } label: { Image(systemName: "plus.circle.fill") }
                        .accessibilityLabel("Ajouter ou importer des contenus")
                }
            }
            .sheet(isPresented: $showingAdd) { ContentEditor(library: library, original: nil) }
            .sheet(item: $editing) { item in ContentEditor(library: library, original: item) }
            .fileImporter(isPresented: $showingImport, allowedContentTypes: [.json]) { result in
                do {
                    let url = try result.get()
                    let scoped = url.startAccessingSecurityScopedResource()
                    defer { if scoped { url.stopAccessingSecurityScopedResource() } }
                    let count = try library.importJSON(Data(contentsOf: url))
                    selectedTheme = nil
                    search = ""
                    message = "\(count) nouveau(x) contenu(s) importé(s) dans « À classer ». Les doublons ont été ignorés."
                } catch { message = error.localizedDescription }
            }
            .alert("Collections", isPresented: Binding(get: { message != nil }, set: { if !$0 { message = nil } })) {
                Button("OK") { message = nil }
            } message: { Text(message ?? "") }
            .onReceive(library.$storageWarning) { warning in if let warning { message = warning } }
        }.tint(.purple)
    }
    private func themeButton(_ title: String, theme: String?) -> some View {
        Button { selectedTheme = theme } label: {
            Text(title).font(.subheadline.weight(.medium))
                .padding(.horizontal, 14).padding(.vertical, 9)
                .background(selectedTheme == theme ? Color.purple : Color.gray.opacity(0.1), in: Capsule())
                .foregroundStyle(selectedTheme == theme ? Color.white : Color.primary)
        }.accessibilityAddTraits(selectedTheme == theme ? .isSelected : [])
    }
}

private struct ContentEditor: View {
    @ObservedObject var library: ContentLibrary
    let original: SavedContent?
    @Environment(\.dismiss) private var dismiss
    @State private var title: String
    @State private var url: String
    @State private var theme: String
    @State private var newTheme = ""
    @State private var note: String
    @State private var error: String?
    init(library: ContentLibrary, original: SavedContent?) {
        self.library = library
        self.original = original
        _title = State(initialValue: original?.title ?? "")
        _url = State(initialValue: original?.url ?? "")
        _theme = State(initialValue: original?.theme ?? "À classer")
        _note = State(initialValue: original?.note ?? "")
    }
    var body: some View {
        NavigationStack {
            Form {
                Section("Publication") {
                    TextField("Lien Instagram", text: $url)
                        .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                    TextField("Titre (facultatif)", text: $title)
                }
                Section("Classement") {
                    Picker("Thème", selection: $theme) {
                        ForEach(library.themes, id: \.self) { Text($0).tag($0) }
                    }
                    TextField("Ou créer un nouveau thème", text: $newTheme)
                    TextField("Votre note (facultative)", text: $note, axis: .vertical).lineLimit(3...6)
                }
                Section {
                    Text("Les liens et notes restent sur cet appareil. Les publications s’ouvrent sur Instagram ; leur accès dépend de votre compte et de leur disponibilité.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                if let error { Section { Text(error).foregroundStyle(.red) } }
            }
            .navigationTitle(original == nil ? "Ajouter un contenu" : "Modifier le contenu")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer") {
                        var content = original ?? SavedContent(title: "", url: "", theme: "", note: "")
                        content.title = title
                        content.url = url
                        content.theme = newTheme.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? theme : newTheme
                        content.note = note
                        do { try library.save(content); dismiss() }
                        catch { self.error = error.localizedDescription }
                    }.disabled(url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }.tint(.purple)
    }
}

#Preview { ContentView() }
