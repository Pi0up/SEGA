import React, { useState } from 'react';

// Exemple de composant avec des défauts ergonomiques intentionnels pour tester l'audit
export function BadCheckoutForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ phone: '', email: '' });

  const handleDelete = () => {
    // Action destructive sans modale de confirmation (Axe 3)
    console.log("Compte supprimé directement");
  };

  return (
    <div style={{ width: '1200px' }}> {/* Largeur fixe cassant le mobile (Axe 4) */}
      <h2>Finaliser ma commande</h2>

      {/* Input sans label explicite ni aria-label (Axe 1 & Axe 8) */}
      <input
        type="text"
        placeholder="Téléphone"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
      />

      {/* Bouton avec événement onClick sur une div sans clavier ni role (Axe 4 & Axe 8) */}
      <div
        className="btn-custom"
        onClick={() => alert("Code promo appliqué")}
        style={{ color: '#ccc', backgroundColor: '#fff' }} /* Contraste faible */
      >
        Appliquer coupon
      </div>

      {/* Bouton disabled sans explication ni aria-disabled (Axe 1) */}
      <button disabled={!formData.phone}>
        Payer
      </button>

      {/* Bouton suppression sans confirmation (Axe 3) */}
      <button onClick={handleDelete}>
        Supprimer mon compte
      </button>
    </div>
  );
}
