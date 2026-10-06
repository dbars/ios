import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "swift")
                .font(.system(size: 64))
                .foregroundStyle(.orange)
            Text("Bienvenue")
                .font(.largeTitle.bold())
            Text("Votre application iOS est prête à évoluer.")
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
