<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { Plus, Trash2, Edit3, Loader, Package, AlertCircle } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { showToast, showConfirm } from '@/lib/feedback';

interface Product {
  id: number;
  name: string;
  price: number;
  description: string | null;
  hiboutikId: number | null;
  createdAt: string;
}

const products = ref<Product[]>([]);
const isLoading = ref(false);
const showCreateForm = ref(false);
const isSubmitting = ref(false);

const newProduct = ref({
  name: '',
  price: '',
  description: ''
});

onMounted(() => {
  fetchProducts();
});

const fetchProducts = async () => {
  isLoading.value = true;
  try {
    const res = await axios.get('/api/products');
    products.value = res.data;
  } catch (error) {
    console.error('Failed to fetch products', error);
    showToast('Erreur lors du chargement des produits', 'error');
  } finally {
    isLoading.value = false;
  }
};

const handleCreateProduct = async () => {
  if (!newProduct.value.name || !newProduct.value.price) {
    showToast('Le nom et le prix sont obligatoires', 'error');
    return;
  }

  isSubmitting.value = true;
  try {
    const payload = {
      name: newProduct.value.name,
      price: parseFloat(newProduct.value.price),
      description: newProduct.value.description
    };
    
    const res = await axios.post('/api/products', payload);
    products.value.unshift(res.data);
    showCreateForm.value = false;
    newProduct.value = { name: '', price: '', description: '' };
    showToast('Produit créé avec succès (et synchronisé avec Hiboutik)', 'success');
  } catch (error: any) {
    console.error('Create product error:', error);
    showToast('Erreur: ' + (error.response?.data?.error || error.message), 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR');
};
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-zinc-100 pb-6">
        <div>
          <h1 class="text-3xl font-bold text-black tracking-tight mb-2">Produits / Services</h1>
          <p class="text-sm text-zinc-500">Gérez votre catalogue de produits et services synchronisé avec Hiboutik.</p>
        </div>
        <Button @click="showCreateForm = true" class="bg-black hover:bg-zinc-800 text-white rounded-none px-6 h-10 uppercase tracking-wider text-xs font-semibold">
          <Plus :size="16" class="mr-2" /> Nouveau Produit
        </Button>
      </div>
    </div>

    <!-- Content List -->
    <div class="flex-1 overflow-auto">
      <div class="bg-white border border-zinc-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200">
            <tr>
              <th class="px-6 py-4">Nom du produit/service</th>
              <th class="px-6 py-4">Prix</th>
              <th class="px-6 py-4 hidden sm:table-cell">Statut Hiboutik</th>
              <th class="px-6 py-4 hidden md:table-cell">Date d'ajout</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100">
            <tr v-if="isLoading">
              <td colspan="4" class="p-8 text-center text-zinc-500">
                <Loader class="animate-spin mx-auto mb-2" :size="24" />
                Chargement...
              </td>
            </tr>
            <tr v-else-if="products.length === 0">
              <td colspan="4" class="p-12 text-center text-zinc-400 text-sm">
                Aucun produit trouvé. Créez-en un nouveau !
              </td>
            </tr>
            <tr v-else v-for="product in products" :key="product.id" class="hover:bg-zinc-50 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                    <Package :size="16" />
                  </div>
                  <div>
                    <div class="font-bold text-zinc-900 text-sm tracking-tight">{{ product.name }}</div>
                    <div v-if="product.description" class="text-xs text-zinc-500 truncate max-w-[200px]">{{ product.description }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-black">{{ product.price.toFixed(2) }} €</div>
              </td>
              <td class="px-6 py-4 hidden sm:table-cell">
                <Badge v-if="product.hiboutikId" variant="outline" class="border-green-200 bg-green-50 text-green-700 rounded-none font-mono text-xs">
                  Sync ID: {{ product.hiboutikId }}
                </Badge>
                <Badge v-else variant="outline" class="border-orange-200 bg-orange-50 text-orange-700 rounded-none font-mono text-xs">
                  <AlertCircle :size="12" class="mr-1 inline" /> Non sync
                </Badge>
              </td>
              <td class="px-6 py-4 text-zinc-500 text-sm hidden md:table-cell">
                {{ formatDate(product.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Product Modal -->
    <Dialog v-model:open="showCreateForm">
      <DialogContent class="sm:max-w-md rounded-2xl border-zinc-200/60 p-6 shadow-2xl bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle class="text-xl font-bold tracking-tight">Ajouter un produit</DialogTitle>
          <DialogDescription>Ce produit sera automatiquement ajouté à votre compte Hiboutik.</DialogDescription>
        </DialogHeader>
        <form @submit.prevent="handleCreateProduct" class="space-y-4 pt-4">
          <div class="space-y-1">
            <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nom du produit/service *</label>
            <Input v-model="newProduct.name" required placeholder="Ex: Audit Energétique" class="rounded-xl border-zinc-200/80 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Prix (€) *</label>
            <Input v-model="newProduct.price" required type="number" step="0.01" min="0" placeholder="Ex: 99.00" class="rounded-xl border-zinc-200/80 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Description (Optionnel)</label>
            <Input v-model="newProduct.description" placeholder="Description courte" class="rounded-xl border-zinc-200/80 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950" />
          </div>
          
          <DialogFooter class="mt-6">
            <Button type="button" variant="outline" @click="showCreateForm = false" class="rounded-xl border-zinc-200/80">Annuler</Button>
            <Button type="submit" :disabled="isSubmitting" class="bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl shadow-sm transition-all">
              <Loader v-if="isSubmitting" class="animate-spin mr-2" :size="16" /> Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
